// Automatic delivery email for the Sold-Out Launch Studio.
// Stripe calls this after each checkout (event: checkout.session.completed). If the order is paid, the buyer gets an
// email with a link that unlocks the Studio on any device (/access/?session_id=…), sent through Resend.
// Endpoint: /.netlify/functions/stripe-webhook   (add it in Stripe → Developers → Webhooks)
//
// Netlify environment variables (the email stays off until all three are set):
//   STRIPE_WEBHOOK_SECRET   the webhook's signing secret (whsec_…)
//   RESEND_API_KEY          API key from resend.com
//   DELIVERY_FROM           sender, e.g. "Tolu <hello@yourdomain.com>" (domain verified in Resend)
// Optional: SITE_URL (defaults to this site's address), STRIPE_PAYMENT_LINK (only email buyers of that link).

const RESEND = process.env.RESEND_API_BASE || "https://api.resend.com"; // overridable for local tests only
const enc = new TextEncoder();

async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameHex(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function verify(body, header, secret) {
  const parts = Object.fromEntries((header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = (header || "").split(",").filter((p) => p.trim().startsWith("v1=")).map((p) => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = await hmacHex(secret, `${t}.${body}`);
  return sigs.some((s) => sameHex(s, want));
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const body = await req.text();
  if (!(await verify(body, req.headers.get("stripe-signature"), secret))) return new Response("Bad signature", { status: 400 });

  let event;
  try { event = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (event.type !== "checkout.session.completed") return new Response("Ignored", { status: 200 });

  const s = event.data?.object || {};
  const plinks = String(process.env.STRIPE_PAYMENT_LINK || "").split(",").map((x) => x.trim()).filter(Boolean);
  const email = s.customer_details?.email;
  if (s.payment_status !== "paid" || (plinks.length && !plinks.includes(s.payment_link)) || !email) return new Response("Skipped", { status: 200 });
  if (!process.env.RESEND_API_KEY || !process.env.DELIVERY_FROM) return new Response("Email not configured", { status: 200 });

  const site = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const link = `${site}/access/?session_id=${encodeURIComponent(s.id)}`;
  const name = s.customer_details?.name ? esc(s.customer_details.name.split(" ")[0]) : "there";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0c2142">
<h1 style="font-size:24px">You're in! 🎉</h1>
<p>Hi ${name},</p>
<p>Thank you for buying the <b>Sold-Out Launch Studio</b>. Here's your access:</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#d4a849;color:#07152b;padding:14px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Open the Sold-Out Launch Studio</a></p>
<p>This link unlocks the Studio and the AI Script Writer in your browser. Keep this email: you can use the same link on a new phone or computer.</p>
<p>Inside you'll find your 30-day launch calendar, 120 interactive launch scripts, the AI Script Writer, the Authority Content Studio and the Live Stream Selling Script.</p>
${/^https:\/\//.test(process.env.COMMUNITY_URL || "") ? `<p><b>Join the community:</b> <a href="${esc(process.env.COMMUNITY_URL)}">${esc(process.env.COMMUNITY_URL)}</a></p>` : ""}
${s.mode === "subscription" ? "<p>Your subscription keeps the Studio unlocked. About once a month you may be asked to confirm your access: just open this email's link again.</p>" : ""}
<p>Questions? Just reply to this email.</p>
<p>Tolu<br>learnwithtolu</p></div>`;
  const text = `You're in!\n\nThank you for buying the Sold-Out Launch Studio.\nOpen it here: ${link}\n\nKeep this email: the same link works on a new phone or computer.\n\n${/^https:\/\//.test(process.env.COMMUNITY_URL || "") ? "Join the community: " + process.env.COMMUNITY_URL + "\n\n" : ""}Questions? Just reply to this email.\nTolu, learnwithtolu`;

  const res = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `delivery-${s.id}` },
    body: JSON.stringify({ from: process.env.DELIVERY_FROM, to: [email], subject: "Your Sold-Out Launch Studio access 🎉", html, text }),
  });
  if (!res.ok) {
    console.error("delivery email failed", res.status, await res.text().catch(() => ""));
    return new Response("Email failed", { status: 502 }); // Stripe retries failed webhooks
  }
  return new Response("Sent", { status: 200 });
};
