import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { HSTS_HEADER, HSTS_VALUE, requestScheme } from "@/lib/https";

const handleI18nRouting = createMiddleware(routing);

/**
 * next-intl's locale routing, plus HSTS on the responses this layer produces.
 *
 * **Why HSTS is here as well as in `next.config.ts`.** OpenNext's
 * `routingHandler` returns a middleware result immediately, before it merges
 * the headers from `next.config.ts`
 * (`@opennextjs/aws/dist/core/routing/routingHandler.js`). The most-visited URL
 * on the site — `https://topcleaning.md/`, which redirects to `/ro` — is
 * exactly such a result, so without this it would be the one response on the
 * site with no `Strict-Transport-Security` on it. The config rules still carry
 * the paths this middleware's matcher skips (`/robots.txt`, `/sitemap.xml`).
 * Where both apply, they set the same key to the same value from the same
 * constant, and the merge collapses them to one header.
 *
 * Gated on the request having actually arrived over HTTPS. That is not
 * ceremony: without it `pnpm dev` would pin `localhost` to HTTPS in the
 * developer's browser for a year, and there is no plain-HTTP `localhost:3000`
 * to go back to. `requestScheme` returns `null` locally, so nothing is set.
 */
export default function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  if (requestScheme(request.headers) === "https") {
    response.headers.set(HSTS_HEADER, HSTS_VALUE);
  }

  return response;
}

export const config = {
  // Match everything except Next internals, the API surface and static assets
  // (anything containing a dot, e.g. favicon.ico, robots.txt, images).
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
