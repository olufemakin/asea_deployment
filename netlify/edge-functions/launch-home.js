// On the separate Sold-Out Launch Studio Netlify project, the home page should be the sales page,
// not the interview app that shares this repo. Set LAUNCH_SITE=1 on that project only.
export default async (request, context) => {
  if (Netlify.env.get("LAUNCH_SITE") !== "1") return context.next();
  return Response.redirect(new URL("/launch-scripts/", request.url), 302);
};

export const config = { path: ["/", "/index.html"] };
