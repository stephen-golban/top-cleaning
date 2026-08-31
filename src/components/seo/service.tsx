import { type Locale, localeHtmlLang } from "@/i18n/routing";
import { toAbsoluteUrl } from "@/lib/seo/urls";
import { BUSINESS_NODE_ID } from "./ids";
import { JsonLd, type JsonLdNode, SCHEMA_CONTEXT } from "./json-ld";

/**
 * `Service` — one node per service detail page.
 *
 * `provider` is a bare `{"@id": …}` reference to the `LocalBusiness` node, so
 * the company's details are stated once per page rather than repeated inside
 * every service. **That reference only resolves if `LocalBusinessJsonLd` is
 * also rendered on the page** — render it in `src/app/[locale]/layout.tsx` and
 * every page gets it for free.
 *
 * No `offers` and no `hasOfferCatalog`: an `Offer` implies a price, and this
 * business quotes per job after seeing it. The list of what a service includes
 * is real content and lives on the page itself; expressing it as priceless
 * `Offer` nodes would be structured data pretending to be a price list.
 */
export interface ServiceJsonLdProps {
  readonly locale: Locale;
  /** Service name in this locale — `service.name[locale]`. */
  readonly name: string;
  /** Short description — `service.summary[locale]` or the meta description. */
  readonly description: string;
  /** The page's canonical URL. Absolute, or a root-relative path. */
  readonly url: string;
  /** The city served, in this locale. Pass `t("common.city")`. */
  readonly city: string;
  /** The service photograph. Absolute, or a root-relative path. */
  readonly imageUrl?: string;
  /**
   * A stable, locale-independent category, e.g. `"Deep cleaning"`. Optional:
   * schema.org's cleaning example puts the category here rather than inventing
   * a `@type`. Falls back to `name` when unset.
   */
  readonly serviceType?: string;
}

export function buildServiceNode({
  locale,
  name,
  description,
  url,
  city,
  imageUrl,
  serviceType,
}: ServiceJsonLdProps): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Service",
    name,
    description,
    url: toAbsoluteUrl(url),
    serviceType: serviceType ?? name,
    inLanguage: localeHtmlLang[locale],
    image: imageUrl ? toAbsoluteUrl(imageUrl) : undefined,
    provider: { "@id": BUSINESS_NODE_ID },
    areaServed: { "@type": "City", name: city },
  };
}

export function ServiceJsonLd(props: ServiceJsonLdProps) {
  return <JsonLd node={buildServiceNode(props)} />;
}
