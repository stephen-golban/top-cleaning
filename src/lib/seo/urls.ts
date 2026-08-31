import { getLocalizedPathnames, type Href } from "@/i18n/navigation";
import { defaultLocale, type Locale, localeHtmlLang, locales } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/site";

/**
 * Canonical URLs and hreflang clusters.
 *
 * Both the sitemap and every page's `alternates` need the same two things: the
 * absolute URL of this page in this locale, and the absolute URL of the same
 * page in each of the others. These are the only builders for that, so the two
 * can never disagree.
 *
 * Alternates are keyed by the BCP 47 tags in `localeHtmlLang` — the same tags
 * that go on `<html lang>` — plus `x-default`, which points at Romanian
 * because `/` redirects to `/ro` (`.agents/DECISIONS.md`).
 */

/** The hreflang key that tells crawlers which locale to serve when unsure. */
export const X_DEFAULT = "x-default";

/**
 * Absolute URLs for one page in every locale, keyed by hreflang tag, with
 * `x-default` aliased to the default locale.
 */
export function hreflangAlternates(
  paths: Readonly<Record<Locale, string>>,
): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[localeHtmlLang[locale]] = absoluteUrl(paths[locale]);
  }
  languages[X_DEFAULT] = absoluteUrl(paths[defaultLocale]);

  return languages;
}

/** The absolute canonical URL of one page in one locale. */
export function canonicalUrl(
  paths: Readonly<Record<Locale, string>>,
  locale: Locale,
): string {
  return absoluteUrl(paths[locale]);
}

/**
 * `hreflangAlternates` for a route referenced by its internal href, e.g.
 * `routeHreflangAlternates("/about")`.
 *
 * Service detail pages have locale-varying slugs, so they cannot be addressed
 * by a single `href` — use `publicRoutes` from `./routes` (or pass the paths
 * to `hreflangAlternates` directly) for those.
 */
export function routeHreflangAlternates(href: Href): Record<string, string> {
  return hreflangAlternates(getLocalizedPathnames(href));
}

/** The absolute canonical URL of a route referenced by its internal href. */
export function routeCanonicalUrl(href: Href, locale: Locale): string {
  return canonicalUrl(getLocalizedPathnames(href), locale);
}

/** Absolute URL of a locale's home page, e.g. `https://topcleaning.md/ro`. */
export function localeHomeUrl(locale: Locale): string {
  return routeCanonicalUrl("/", locale);
}

/**
 * Passes an absolute URL through unchanged and resolves a root-relative path
 * against the site URL. Lets callers hand these helpers either shape.
 */
export function toAbsoluteUrl(urlOrPath: string): string {
  return urlOrPath.startsWith("/") ? absoluteUrl(urlOrPath) : urlOrPath;
}
