// Paid access for the Sold-Out Launch Studio, backed by a Stripe Payment Link.
// Served at /.netlify/functions/access
//   GET                                    → { enabled, checkoutUrl, member }
//   POST { action:"claim", session_id }     → after Stripe checkout: verify the paid session, set the access cookie
//   POST { action:"restore", email, receipt } → new device: find the paid session by email + Stripe receipt number
//   POST { action:"logout" }                → clear the cookie on this device
//
// Netlify environment variables:
//   STRIPE_SECRET_KEY     restricted key with Checkout Sessions: Read and PaymentIntents/Charges: Read
//   STRIPE_PAYMENT_LINK   the Payment Link id (plink_…); only purchases through it unlock access
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

function isPaid(s) {
  const plink = process.env.STRIPE_PAYMENT_LINK;
  return s && s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required") && (!plink || s.payment_link === plink) && !s.payment_intent?.latest_charge?.refunded;
}
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const norm = (r) => String(r || "").replace(/[^0-9a-z]/gi, "").toLowerCase();

async function grant(session) {
  const token = await signToken(process.env.ACCESS_SECRET, { s: session.id, t: Math.floor(Date.now() / 1000) });
  return json(200, { ok: true }, { "set-cookie": cookieHeader(token) });
}

export default async (req) => {
  const secret = process.env.ACCESS_SECRET;
  const configured = !!(secret && process.env.STRIPE_SECRET_KEY);
  const codes = String(process.env.ACCESS_CODES || "").split(",").map((c) => c.trim()).filter((c) => c.length >= 8);

  if (req.method === "GET") {
    const member = secret ? !!(await verifyToken(secret, readCookie(req.headers.get("cookie")))) : true;
    return json(200, { enabled: !!secret, configured, checkoutUrl: process.env.STORE_URL || process.env.STRIPE_CHECKOUT_URL || "", member, codes: codes.length > 0, stripe: configured, launchDate: process.env.LAUNCH_DATE || "" });
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
      const s = await stripe(`/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent.latest_charge`);
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
      if (process.env.STRIPE_PAYMENT_LINK) q.set("payment_link", process.env.STRIPE_PAYMENT_LINK);
      q.append("expand[]", "data.payment_intent.latest_charge");
      const list = await stripe(`/v1/checkout/sessions?${q}`);
      const match = (list.data || []).find((s) => isPaid(s) && norm(s.payment_intent?.latest_charge?.receipt_number) === receipt);
      // Same answer whether the email or the receipt was wrong, so emails can't be probed.
      if (!match) return json(404, { error: "We couldn't find a purchase with that email and receipt number. Check your Stripe receipt email and try again." });
      return grant(match);
    }
  } catch (e) {
    console.error("access error", e.status, e.message);
    return json(502, { error: "We couldn't reach the payment system. Please try again in a minute." });
  }

  return json(400, { error: "Unknown action." });
};
