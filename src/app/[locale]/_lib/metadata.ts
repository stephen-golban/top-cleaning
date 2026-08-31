import type { Metadata } from "next";
import type { Service } from "@/content";
import { getLocalizedPathnames, getPathname, type Href } from "@/i18n/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";

/**
 * `alternates` for every page on the public site.
 *
 * Two things every route owes search engines, and both are easy to get subtly
 * wrong by hand:
 *
 * - a **canonical** pointing at this locale's own URL, so `/ro/servicii` and
 *   `/ru/uslugi` are not read as duplicates of each other;
 * - **hreflang** entries for all three locales plus `x-default` → `ro`, which
 *   `.agents/DECISIONS.md` fixes as the fallback for anyone whose language we
 *   do not publish.
 *
 * Paths are site-root-relative; `metadataBase` in the locale layout makes them
 * absolute, so nothing here has to know the deployment host.
 */
function alternatesFromPaths(
  paths: Record<Locale, string>,
  locale: Locale,
): Metadata["alternates"] {
  return {
    canonical: paths[locale],
    languages: {
      ...paths,
      "x-default": paths[defaultLocale],
    },
  };
}

/** Alternates for a route whose path does not depend on page data. */
export function alternatesFor(href: Href, locale: Locale): Metadata["alternates"] {
  return alternatesFromPaths(getLocalizedPathnames(href), locale);
}

/**
 * Alternates for a service detail page.
 *
 * `getLocalizedPathnames` cannot do this one: only the `/servicii` ·
 * `/uslugi` · `/services` container segment lives in the routing table, while
 * the slug after it is localized per service in `src/content/services.ts`. Ask
 * for the RO slug under `/en/services/` and you emit an hreflang pointing at a
 * URL that 404s, which is worse than emitting none.
 */
export function serviceAlternates(
  service: Service,
  locale: Locale,
): Metadata["alternates"] {
  const paths = Object.fromEntries(
    locales.map((l) => [
      l,
      getPathname({
        href: { pathname: "/services/[slug]", params: { slug: service.slug[l] } },
        locale: l,
      }),
    ]),
  ) as Record<Locale, string>;

  return alternatesFromPaths(paths, locale);
}
