// Keeps the Members Hub (+ PDF downloads), the Sold-Out Launch Studio and the AI Script Writer for paying customers.
// Off until ACCESS_SECRET is set in Netlify, so the site keeps working while payments are set up.
import { verifyToken, readCookie } from "../shared/access-token.mjs";

export default async (request, context) => {
  const secret = Netlify.env.get("ACCESS_SECRET");
  if (!secret) return context.next();
  if (await verifyToken(secret, readCookie(request.headers.get("cookie")))) return context.next();
  const url = new URL(request.url);
  const to = new URL("/access/", url);
  to.searchParams.set("next", url.pathname + url.search);
  return Response.redirect(to, 302);
};

export const config = { path: ["/members", "/members/*", "/launch-calendar", "/launch-calendar/*", "/script-writer", "/script-writer/*"] };
