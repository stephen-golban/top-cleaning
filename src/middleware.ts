import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match everything except Next internals, the API surface and static assets
  // (anything containing a dot, e.g. favicon.ico, robots.txt, images).
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
