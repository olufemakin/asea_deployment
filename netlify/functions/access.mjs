// Paid access for the Sold-Out Launch Studio, backed by a Stripe Payment Link.
// Served at /.netlify/functions/access
//   GET                                    → { enabled, checkoutUrl, member }
//   POST { action:"claim", session_id }     → after Stripe checkout: verify the paid session, set the access cookie
//   POST { action:"restore", email, receipt } → new device: find the paid session by email + Stripe receipt number
//   POST { action:"logout" }                → clear the cookie on this device
//
// Netlify environment variables:
//   STRIPE_SECRET_KEY     restricted key with Checkout Sessions: Read and PaymentIntents/Charges: Read
//   STRIPE_PAYMENT_LINK   Payment Link id(s) (plink_…, comma-separated: pay in full, payment plan, subscription);
//                         only purchases through these unlock access
//   PLAN_CHECKOUT_URL / SUB_CHECKOUT_URL   checkout links for the payment plan / subscription (shown on the sales page)
//   PRICE_FULL / PRICE_PLAN / PRICE_SUB    their labels, e.g. "$47 one-time", "3 × $17", "$9 / month"
//   COMMUNITY_URL         your community link (WhatsApp, Telegram, Skool…), shown to members after they unlock
//   STRIPE_PLAN_LINK + PLAN_PAYMENTS   the payment-plan link id and its number of instalments (e.g. 3): once all are paid,
//                         access stays on for good even though the plan's subscription has ended
// Subscriptions unlock only while the subscription is active: the cookie lasts 35 days, then the member renews it
// with the link in their delivery email or "Restore my access" (both re-check the subscription with Stripe).
//   STRIPE_CHECKOUT_URL   the Payment Link URL (https://buy.stripe.com/…) shown on the sales and access pages
//   ACCESS_SECRET         long random string that signs the access cookie; setting it switches the paywall on
//   STORE_URL             checkout page when selling elsewhere (e.g. a Stan Store product); used before STRIPE_CHECKOUT_URL
//   LAUNCH_DATE           optional ISO date-time for the /invite/ countdown, e.g. 2026-12-01T18:00:00Z
//   ACCESS_CODES          comma-separated member codes (8+ characters each) delivered to buyers, e.g. by Stan Store.
//                         POST { action:"code", code } unlocks the browser. Remove a code to stop new unlocks with it.
import { signToken, verifyToken, readCookie, cookieHeader, clearCookieHeader } from "../shared/access-token.mjs";

const API = process.env.STRIPE_API_BASE || "https://api.stripe.com"; // overridable for local tests only

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

async function stripe(path) {
  const res = await fetch(API + path, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Stripe error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const links = () => String(process.env.STRIPE_PAYMENT_LINK || "").split(",").map((x) => x.trim()).filter(Boolean);
function isPaid(s) {
  const pl = links();
  if (!s || s.status !== "complete" || !(s.payment_status === "paid" || s.payment_status === "no_payment_required")) return false;
  if (pl.length && !pl.includes(s.payment_link)) return false;
  if (s.payment_intent?.latest_charge?.refunded) return false;
  if (s.mode === "subscription") return ["active", "trialing"].includes(s.subscription?.status); // subscription must still be running
  return true;
}
async function planDone(s) { // a finished payment plan: every instalment paid
  const plan = (process.env.STRIPE_PLAN_LINK || "").trim(), n = Number(process.env.PLAN_PAYMENTS || 0);
  if (!plan || !n || s.payment_link !== plan || s.mode !== "subscription" || !s.subscription || s.payment_intent?.latest_charge?.refunded) return false;
  const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
  if (!/^sub_[A-Za-z0-9]+$/.test(subId || "")) return false;
  const inv = await stripe(`/v1/invoices?subscription=${encodeURIComponent(subId)}&status=paid&limit=100`);
  return (inv.data || []).length >= n;
}
const receiptOf = (s) => s.payment_intent?.latest_charge?.receipt_number || s.invoice?.receipt_number || "";
const SUB_DAYS = 35;
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const norm = (r) => String(r || "").replace(/[^0-9a-z]/gi, "").toLowerCase();

async function grant(session, lifetime) {
  const now = Math.floor(Date.now() / 1000), sub = session.mode === "subscription" && !lifetime;
  const payload = { s: session.id, t: now };
  if (sub) payload.e = now + SUB_DAYS * 86400;
  const token = await signToken(process.env.ACCESS_SECRET, payload);
  return json(200, { ok: true, subscription: sub }, { "set-cookie": sub ? cookieHeader(token, SUB_DAYS * 86400) : cookieHeader(token) });
}

export default async (req) => {
  const secret = process.env.ACCESS_SECRET;
  const configured = !!(secret && process.env.STRIPE_SECRET_KEY);
  const codes = String(process.env.ACCESS_CODES || "").split(",").map((c) => c.trim()).filter((c) => c.length >= 8);

  if (req.method === "GET") {
    const member = secret ? !!(await verifyToken(secret, readCookie(req.headers.get("cookie")))) : true;
    return json(200, { enabled: !!secret, configured, checkoutUrl: process.env.STORE_URL || process.env.STRIPE_CHECKOUT_URL || "",
      options: [["full", process.env.STORE_URL || process.env.STRIPE_CHECKOUT_URL, process.env.PRICE_FULL || "Pay in full"], ["plan", process.env.PLAN_CHECKOUT_URL, process.env.PRICE_PLAN || "Payment plan"], ["sub", process.env.SUB_CHECKOUT_URL, process.env.PRICE_SUB || "Monthly subscription"]]
        .filter((o) => o[1]).map(([id, url, label]) => ({ id, url, label })),
      hasCommunity: /^https:\/\//.test(process.env.COMMUNITY_URL || ""),
      communityUrl: member && /^https:\/\//.test(process.env.COMMUNITY_URL || "") ? process.env.COMMUNITY_URL : "", member, codes: codes.length > 0, stripe: configured, launchDate: process.env.LAUNCH_DATE || "" });
  }
  if (req.method !== "POST") return json(405, { error: "Use GET or POST." });

  let b;
  try { b = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  if (b.action === "logout") return json(200, { ok: true }, { "set-cookie": clearCookieHeader });
  if (b.action === "code") {
    if (!secret || !codes.length) return json(503, { error: "Access codes aren't switched on yet." });
    const given = String(b.code || "").trim().slice(0, 100);
    let ok = false;
    for (const c of codes) ok = sameText(c, given) || ok; // check every code, constant time per code
    if (!ok) return json(401, { error: "That code isn't right. Check the code in your purchase email and try again." });
    const token = await signToken(secret, { c: 1, t: Math.floor(Date.now() / 1000) });
    return json(200, { ok: true }, { "set-cookie": cookieHeader(token) });
  }
  if (!configured) return json(503, { error: "Checkout isn't switched on yet. Please try again later." });

  try {
    if (b.action === "claim") {
      const id = String(b.session_id || "");
      if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return json(400, { error: "That checkout link isn't valid." });
      const s = await stripe(`/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent.latest_charge&expand[]=subscription`);
      if (await planDone(s)) return grant(s, true);
      if (s.mode === "subscription" && s.status === "complete" && s.subscription && !["active", "trialing"].includes(s.subscription.status)) {
        return json(402, { error: "Your subscription or payment plan isn't active any more. Bring your payments up to date to keep using the Studio." });
      }
      if (!isPaid(s)) return json(402, { error: "We couldn't confirm this payment yet. If you were charged, wait a minute and refresh, or restore access with your receipt." });
      return grant(s);
    }

    if (b.action === "restore") {
      const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
      const receipt = norm(b.receipt).slice(0, 40);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || receipt.length < 4) {
        return json(400, { error: "Enter the email you paid with and the receipt number from your Stripe receipt." });
      }
      const q = new URLSearchParams({ "customer_details[email]": email, status: "complete", limit: "20" });
      if (links().length === 1) q.set("payment_link", links()[0]);
      q.append("expand[]", "data.payment_intent.latest_charge");
      q.append("expand[]", "data.subscription");
      q.append("expand[]", "data.invoice");
      const list = await stripe(`/v1/checkout/sessions?${q}`);
      const mine = (list.data || []).filter((s) => norm(receiptOf(s)) === receipt);
      let match = mine.find((s) => isPaid(s)), lifetime = false;
      if (!match) for (const s of mine) if (await planDone(s)) { match = s; lifetime = true; break; }
      // Same answer whether the email or the receipt was wrong, so emails can't be probed.
      if (!match) return json(404, { error: "We couldn't find a purchase with that email and receipt number. Check your Stripe receipt email and try again." });
      return grant(match, lifetime);
    }
  } catch (e) {
    console.error("access error", e.status, e.message);
    return json(502, { error: "We couldn't reach the payment system. Please try again in a minute." });
  }

  return json(400, { error: "Unknown action." });
};
