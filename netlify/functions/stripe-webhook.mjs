// Automatic delivery email for the Sold-Out Launch Studio.
// Stripe calls this after each checkout (event: checkout.session.completed). If the order is paid, the buyer gets an
// email with everything they bought: a link that unlocks the interactive Studio on any device (/access/?session_id=…&next=/launch-calendar/#start),
// the list of deliverables, and the two PDFs attached. Sent through Resend.
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
// Everything the buyer gets, listed in the delivery email. The two PDFs are attached when the function can read them
// (netlify.toml includes members/downloads/*.pdf in this function); otherwise the email points to "Start here" in the Studio.
const DELIVERABLES = [
  ["🏠 Interactive Sold-Out Launch Studio", "everything below in one place, saved as you go (open \"Start here\")"],
  ["📅 30-Day Launch Calendar", "what to post, story, status and one action every day, in every format including B-roll"],
  ["📝 120 Launch Scripts", "12 launch stages × 10 fully-written scripts, filled in for your business"],
  ["✨ AI Launch Script Writer", "any stage and platform, in your voice, plus Make It Sound Human"],
  ["🌟 Personal Branding", "20 posts written from your own answers"],
  ["📖 Authority Content Studio", "teach what you know, keep your proof, balance your content week"],
  ["🎥 Live Stream Selling Script", "25-minute TikTok LIVE and Instagram LIVE scripts"],
  ["📘 Sold-Out Launch Studio Workbook (PDF)", "the calendar, all 120 scripts, live, branding and after-launch posts, printable"],
  ["🎁 Bonus: Selling Confidently & Naturally (PDF)", "sell without feeling salesy, with hook formulas"],
];
const PDFS = ["sold-out-launch-studio-workbook.pdf", "selling-confidently-and-naturally.pdf"];
async function loadAttachments() {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const roots = [process.cwd(), process.env.LAMBDA_TASK_ROOT || "", "/var/task"].filter(Boolean);
  const out = [];
  for (const f of PDFS) {
    for (const r of roots) {
      try { out.push({ filename: f, content: (await readFile(path.join(r, "members/downloads", f))).toString("base64") }); break; } catch {}
    }
  }
  return out;
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
  const link = `${site}/access/?session_id=${encodeURIComponent(s.id)}&next=${encodeURIComponent("/launch-calendar/#start")}`;
  const name = s.customer_details?.name ? esc(s.customer_details.name.split(" ")[0]) : "there";
  const community = /^https:\/\//.test(process.env.COMMUNITY_URL || "") ? process.env.COMMUNITY_URL : "";
  const attachments = await loadAttachments();
  const items = DELIVERABLES.map(([t, d]) => `<li style="margin:0 0 8px"><b>${t}</b><br><span style="color:#4a5b73">${d}</span></li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0c2142;line-height:1.55">
<h1 style="font-size:24px;margin:0 0 12px">You're in! 🎉</h1>
<p>Hi ${name},</p>
<p>Thank you for buying the <b>Sold-Out Launch Studio</b>. Everything you bought is inside your interactive Studio:</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#d4a849;color:#07152b;padding:14px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Open my Sold-Out Launch Studio</a></p>
<p style="font-size:14px;color:#4a5b73">This link unlocks everything in your browser. Keep this email: the same link works on a new phone or computer.</p>
<h2 style="font-size:17px;margin:22px 0 8px">What's inside</h2>
<ul style="padding-left:18px;margin:0">${items}</ul>
${attachments.length ? `<p>📎 <b>Your PDFs are attached to this email</b> (${attachments.map((a) => esc(a.filename)).join(", ")}). You can also download them any time from "Start here" in your Studio.</p>` : `<p>📎 Your PDF downloads are in your Studio under "Start here".</p>`}
${community ? `<p><b>👥 Join the community:</b> <a href="${esc(community)}">${esc(community)}</a></p>` : ""}
${s.mode === "subscription" ? "<p>Your subscription keeps the Studio unlocked. About once a month you may be asked to confirm your access: just open this email's link again.</p>" : ""}
<h2 style="font-size:17px;margin:22px 0 8px">Start in 3 steps</h2>
<ol style="padding-left:18px;margin:0"><li>Open your Studio and the 30-Day Calendar.</li><li>Pick your business and set your writing voice.</li><li>Pick your launch date and do Day 1 today.</li></ol>
<p>Questions? Just reply to this email.</p>
<p>Tolu<br>learnwithtolu</p></div>`;
  const text = `You're in!\n\nThank you for buying the Sold-Out Launch Studio.\nOpen your Sold-Out Launch Studio (everything is there): ${link}\nKeep this email: the same link works on a new phone or computer.\n\nWHAT'S INSIDE\n${DELIVERABLES.map(([t, d]) => `- ${t}: ${d}`).join("\n")}\n\n${attachments.length ? "Your PDFs are attached to this email and are also in your Studio under "Start here".\n\n" : ""}${community ? "Join the community: " + community + "\n\n" : ""}Start: open the Studio, pick your business, set your writing voice, pick your launch date and do Day 1 today.\n\nQuestions? Just reply to this email.\nTolu, learnwithtolu`;

  const res = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `delivery-${s.id}` },
    body: JSON.stringify({ from: process.env.DELIVERY_FROM, to: [email], subject: "Your Sold-Out Launch Studio is ready 🎉 (everything inside)", html, text, ...(attachments.length ? { attachments } : {}) }),
  });
  if (!res.ok) {
    console.error("delivery email failed", res.status, await res.text().catch(() => ""));
    return new Response("Email failed", { status: 502 }); // Stripe retries failed webhooks
  }
  return new Response("Sent", { status: 200 });
};
