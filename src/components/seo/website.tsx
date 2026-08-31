import { type Locale, localeHtmlLang } from "@/i18n/routing";
import { localeHomeUrl } from "@/lib/seo/urls";
import { BUSINESS_NODE_ID, WEBSITE_NODE_ID } from "./ids";
import { JsonLd, type JsonLdNode, SCHEMA_CONTEXT } from "./json-ld";

/**
 * `WebSite` — names the site and ties it to the business that publishes it.
 *
 * No `potentialAction` / `SearchAction`: that markup declares a site search
 * endpoint, and this site has none. Declaring one that 404s is worse than
 * declaring nothing.
 *
 * Render once, in the locale layout, next to `LocalBusinessJsonLd`.
 */
export interface WebSiteJsonLdProps {
  readonly locale: Locale;
  /** Site name. Pass `t("meta.siteName")`. */
  readonly name: string;
  /** Pass `t("meta.description")`. */
  readonly description?: string;
}

export function buildWebSiteNode({
  locale,
  name,
  description,
}: WebSiteJsonLdProps): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": WEBSITE_NODE_ID,
    name,
    description,
    url: localeHomeUrl(locale),
    inLanguage: localeHtmlLang[locale],
    publisher: { "@id": BUSINESS_NODE_ID },
  };
}

export function WebSiteJsonLd(props: WebSiteJsonLdProps) {
  return <JsonLd node={buildWebSiteNode(props)} />;
}
