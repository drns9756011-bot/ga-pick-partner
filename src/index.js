const CUSTOMER_ORIGIN = "https://ga-pick.com";
const PARTNER_ORIGIN = "https://partner.ga-pick.com";

function noStore(response, routeVersion) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-GA-Pick-Partner-Route-Version", routeVersion);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serveAsset(request, env, assetPath, routeVersion) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: "GET",
    headers: request.headers,
    redirect: "manual",
  }));
  return noStore(response, routeVersion);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    const routeVersion = "20260821-partner-web-split-v1";

    if (path === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex, nofollow, noarchive" },
      });
    }

    if (path.startsWith("/api/")) {
      const apiUrl = new URL(url.pathname + url.search, CUSTOMER_ORIGIN);
      const upstream = await fetch(new Request(apiUrl.toString(), request));
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
    }
    if (path === "/" || path === "/index.html" || path === "/login") return serveAsset(request, env, "/seller/index.html", routeVersion);
    if (path === "/register" || path === "/register/index.html") return serveAsset(request, env, "/seller/register/index.html", routeVersion);
    if (path === "/seller" || path === "/seller/index.html") return Response.redirect(`${PARTNER_ORIGIN}/`, 308);
    if (path === "/seller/register" || path === "/seller/register/index.html") return Response.redirect(`${PARTNER_ORIGIN}/register`, 308);

    const customerRoutes = ["/quote", "/my-quote", "/brand", "/subscription", "/shopping", "/products"];
    if (customerRoutes.some((route) => path === route || path.startsWith(`${route}/`))) {
      return Response.redirect(new URL(url.pathname + url.search, CUSTOMER_ORIGIN).toString(), 308);
    }
    return noStore(await env.ASSETS.fetch(request), routeVersion);
  },
};
