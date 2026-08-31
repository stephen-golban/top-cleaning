import { assertNoPrivateRoutes } from "./private-routes";
import { publicRoutes } from "./routes";
import { hreflangAlternates } from "./urls";
import { locales } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/site";
import type { ChangeFrequency } from "./routes";

/**
 * The sitemap, as data. `src/app/sitemap.ts` is a one-line wrapper around this
 * so the entries can be built and asserted without a Next build.
 *
 * One entry per route per locale — three URLs for every page — each carrying
 * the full hreflang cluster (all three locales plus `x-default` → ro), which is
 * what tells Google the three are translations of one page rather than three
 * competing pages.
 *
 * `lastModified` is deliberately absent. The old site set it to `new Date()`,
 * so every URL claimed to have changed today, every day; a `lastmod` that is
 * always now is worse than none, because crawlers learn to ignore it. There is
 * no build-time content timestamp to use instead — the copy lives in git, not a
 * CMS — so the field is left out until there is a real value for it.
 */

export interface SitemapEntry {
  readonly url: string;
  readonly changeFrequency: ChangeFrequency;
  readonly priority: number;
  readonly alternates: { readonly languages: Record<string, string> };
}

/**
 * Build every sitemap entry.
 *
 * The `/v/` guard runs on the way out. It is the last thing between this
 * function and a published XML file, and it is not optional: `publicRoutes` is
 * typed to exclude private routes, but types do not survive a hand-written
 * string, and the cost of being wrong here is the client's private videos in
 * Google's index (`.agents/FOLLOWUPS.md`, HARD CONSTRAINTS). Do not remove it,
 * and do not let entries reach the caller without passing through it.
 */
export function buildSitemap(): readonly SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  for (const route of publicRoutes) {
    const languages = hreflangAlternates(route.paths);

    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(route.paths[locale]),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return assertNoPrivateRoutes(entries, "sitemap.xml");
}
