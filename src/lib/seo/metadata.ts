import type { Metadata } from "next";
import { ogImage } from "@/content/images";
import { type Locale, localeHtmlLang, locales } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/site";
import { canonicalUrl, hreflangAlternates } from "./urls";

/**
 * Typed defaults for a page's `generateMetadata`.
 *
 * The layout already sets `metadataBase`, the title template and the fallback
 * description; these helpers cover the parts that differ per page — canonical,
 * hreflang, OpenGraph and Twitter — so no page has to assemble them by hand and
 * quietly get one wrong.
 *
 * All URLs are emitted absolute. `metadataBase` would resolve relative ones,
 * but hreflang and `og:url` are read by crawlers that do not always apply it.
 *
 * Nothing here reads the message files: copy stays the caller's job. A page
 * passes `t("meta.services.title")` and friends, which keeps these helpers
 * usable from anywhere and keeps the strings in `messages/*.json` where
 * `pnpm check:i18n` can see them.
 */

/** OpenGraph wants `ro_MD`, hreflang wants `ro-MD`. Same tag, different punctuation. */
const ogLocale: Readonly<Record<Locale, string>> = Object.fromEntries(
  locales.map((locale) => [locale, localeHtmlLang[locale].replace("-", "_")]),
) as Record<Locale, string>;

/** The default share card: the `ogImage` slot from `src/content/images.ts`. */
export function defaultOpenGraphImage(alt?: string) {
  return {
    url: absoluteUrl(ogImage.src),
    width: ogImage.width,
    height: ogImage.height,
    type: ogImage.type,
    ...(alt ? { alt } : {}),
  };
}

export interface PageSeoInput {
  readonly locale: Locale;
  /** Public path per locale — from `publicRoutes`, or `getLocalizedPathnames`. */
  readonly paths: Readonly<Record<Locale, string>>;
  readonly title: string;
  readonly description: string;
  /**
   * Site name for `og:site_name`. Pass `t("meta.siteName")` — it is not read
   * from the messages here so these helpers stay usable outside a request.
   */
  readonly siteName?: string;
  /** Alt text for the share card. Pass a `meta` string if you have one. */
  readonly imageAlt?: string;
  /** `article` for a service page, `website` elsewhere. Defaults to `website`. */
  readonly ogType?: "website" | "article";
}

/** Canonical + hreflang languages, ready to spread into `Metadata.alternates`. */
export function alternatesFor(input: Pick<PageSeoInput, "locale" | "paths">) {
  return {
    canonical: canonicalUrl(input.paths, input.locale),
    languages: hreflangAlternates(input.paths),
  };
}

/** OpenGraph defaults for a page. */
export function openGraphFor(input: PageSeoInput): NonNullable<Metadata["openGraph"]> {
  return {
    type: input.ogType ?? "website",
    url: canonicalUrl(input.paths, input.locale),
    title: input.title,
    description: input.description,
    locale: ogLocale[input.locale],
    alternateLocale: locales
      .filter((locale) => locale !== input.locale)
      .map((locale) => ogLocale[locale]),
    images: [defaultOpenGraphImage(input.imageAlt)],
    ...(input.siteName ? { siteName: input.siteName } : {}),
  };
}

/** Twitter card defaults. Mirrors OpenGraph — no separate copy to keep in sync. */
export function twitterFor(input: PageSeoInput): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: [absoluteUrl(ogImage.src)],
  };
}

/**
 * Everything above in one object, for the common case:
 *
 * ```ts
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const { locale } = await params;
 *   const t = await getTranslations({ locale, namespace: "meta" });
 *   return pageMetadata({
 *     locale,
 *     paths: getLocalizedPathnames("/about"),
 *     title: t("about.title"),
 *     description: t("about.description"),
 *     siteName: t("siteName"),
 *   });
 * }
 * ```
 *
 * Spread the result and override anything you need — it is a plain `Metadata`.
 */
export function pageMetadata(input: PageSeoInput): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: alternatesFor(input),
    openGraph: openGraphFor(input),
    twitter: twitterFor(input),
  };
}
