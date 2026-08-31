import type { Metadata } from "next";
import type { Service } from "@/content";
import { getLocalizedPathnames, getPathname, type Href } from "@/i18n/navigation";
import { defaultLocale, locales, type Locale, localeHtmlLang } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/site";

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

/** OpenGraph wants `ro_MD`; hreflang wants `ro-MD`. Same tag, different punctuation. */
const ogLocale: Readonly<Record<Locale, string>> = Object.fromEntries(
  locales.map((locale) => [locale, localeHtmlLang[locale].replace("-", "_")]),
) as Record<Locale, string>;

/**
 * The OpenGraph fields a page cannot inherit correctly from the layout.
 *
 * Deliberately **not** here: `title` and `description`. Next resolves those
 * from the page's own `title`/`description` *after* the layout's title template
 * has run, so restating them would drop the ` — Top Cleaning` suffix from every
 * share card.
 *
 * `url` is the field that genuinely varies per page and has no sensible
 * inherited value: WhatsApp, Viber, Telegram and Facebook all read `og:url` as
 * the canonical identity of a shared link, and this site's links get shared on
 * exactly those.
 *
 * ## Why `images` has to be restated
 *
 * The branded card ships as `src/app/opengraph-image.png` — a file convention,
 * attached by Next at the *root* segment. Metadata objects are merged
 * shallowly and `openGraph` is replaced wholesale by the deepest segment that
 * declares one, so the moment a page sets `openGraph` at all, the root
 * segment's file-convention image disappears from the resolved card. Naming
 * the same file explicitly is what keeps the lockup on every share.
 *
 * The route Next generates for that file is served at `/opengraph-image.png`
 * (the `?<hash>` Next appends elsewhere is only a cache-buster), so pointing at
 * the plain path resolves to the same bytes. `src/app/opengraph-image.alt.txt`
 * stays as the English fallback for anything outside this layout — the pages
 * below pass their own localized alt from `meta.ogImageAlt`.
 */
const BRANDED_OG_IMAGE = {
  url: absoluteUrl("/opengraph-image.png"),
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

function openGraphFromPaths(
  paths: Record<Locale, string>,
  locale: Locale,
  siteName: string,
  imageAlt: string,
): Metadata["openGraph"] {
  return {
    type: "website",
    url: absoluteUrl(paths[locale]),
    siteName,
    locale: ogLocale[locale],
    alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
    images: [{ ...BRANDED_OG_IMAGE, alt: imageAlt }],
  };
}

/** OpenGraph for a route whose path does not depend on page data. */
export function openGraphFor(
  href: Href,
  locale: Locale,
  siteName: string,
  imageAlt: string,
): Metadata["openGraph"] {
  return openGraphFromPaths(getLocalizedPathnames(href), locale, siteName, imageAlt);
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
function servicePaths(service: Service): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((l) => [
      l,
      getPathname({
        href: { pathname: "/services/[slug]", params: { slug: service.slug[l] } },
        locale: l,
      }),
    ]),
  ) as Record<Locale, string>;
}

export function serviceAlternates(
  service: Service,
  locale: Locale,
): Metadata["alternates"] {
  return alternatesFromPaths(servicePaths(service), locale);
}

/** OpenGraph for a service detail page. Same locale-varying-slug problem. */
export function serviceOpenGraph(
  service: Service,
  locale: Locale,
  siteName: string,
  imageAlt: string,
): Metadata["openGraph"] {
  return openGraphFromPaths(servicePaths(service), locale, siteName, imageAlt);
}
