import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { PRIVATE_PATH_SEGMENTS } from "@/lib/seo/private-routes";
import { siteUrl } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * The private video routes are disallowed here as defence in depth. Note the
 * trade-off, which is deliberate: naming `/v/` in robots.txt advertises that the
 * route exists. That is acceptable because the route is worthless without a
 * 192-bit token, and Cloudflare Stream refuses playback without a signed JWT
 * regardless. What it buys is that a well-behaved crawler which somehow acquires
 * a link — from a scanned QR posted online, a referrer header, a shared
 * screenshot — will not index it.
 *
 * Tokens themselves never appear here, and the `X-Robots-Tag` header plus the
 * page's own `noindex` meta cover crawlers that ignore robots.txt directives.
 *
 * The disallowed segments come from `src/lib/seo/private-routes.ts`, the same
 * constant the sitemap builder asserts against, so robots.txt and sitemap.xml
 * cannot drift apart about what "private" means. Everything else is allowed,
 * and the sitemap is advertised below.
 */
export default function robots(): MetadataRoute.Robots {
  const privateVideoPaths = PRIVATE_PATH_SEGMENTS.flatMap((segment) => [
    `/${segment}/`,
    ...locales.map((locale) => `/${locale}/${segment}/`),
    `/*/${segment}/`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateVideoPaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
