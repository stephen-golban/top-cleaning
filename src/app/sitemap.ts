import type { MetadataRoute } from "next";
import { buildSitemap } from "@/lib/seo/sitemap";

/**
 * `/sitemap.xml`.
 *
 * Every public route × every locale, each with its full hreflang cluster. The
 * entries are built and — critically — checked for private `/v/` paths in
 * `src/lib/seo/sitemap.ts`; this file only adapts the result to Next's type.
 *
 * If you are here to add a URL, add it to the route table in
 * `src/lib/seo/routes.ts`. Do not hand-write entries here: routes added here
 * bypass the localized-pathname lookup and the private-route assertion.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...buildSitemap()];
}
