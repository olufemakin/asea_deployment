// Signed access cookie for paying customers of the Sold-Out Launch Studio.
// Used by the Netlify Function (Node) and the Edge Function (Deno): Web Crypto only, no imports.
// Token: v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256(secret, "v1." + payload))>

export const COOKIE = "lwt_access";
export const MAX_AGE = 400 * 24 * 60 * 60; // 400 days, the longest browsers keep a cookie

const enc = new TextEncoder();
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function signToken(secret, payload) {
  const body = "v1." + b64url(enc.encode(JSON.stringify(payload)));
  return body + "." + b64url(await hmac(secret, body));
}

export async function verifyToken(secret, token) {
  if (!secret || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  try {
    const want = await hmac(secret, parts[0] + "." + parts[1]);
    if (!sameBytes(want, fromB64url(parts[2]))) return null;
    return JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch {
    return null;
  }
}

export function readCookie(header, name = COOKIE) {
  const m = (header || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function cookieHeader(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export const clearCookieHeader = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
