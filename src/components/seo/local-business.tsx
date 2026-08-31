import { contact } from "@/content/contact";
import { ogImage } from "@/content/images";
import { type Locale, localeHtmlLang, locales } from "@/i18n/routing";
import { localeHomeUrl, toAbsoluteUrl } from "@/lib/seo/urls";
import { BUSINESS_NODE_ID } from "./ids";
import { JsonLd, type JsonLdNode, SCHEMA_CONTEXT } from "./json-ld";

/**
 * `LocalBusiness` — the node that says who this company is.
 *
 * ## Why `LocalBusiness` and not `CleaningService`
 *
 * There is no `CleaningService` type in schema.org. Its `LocalBusiness`
 * subtypes are a fixed list (`DryCleaningOrLaundry`,
 * `HomeAndConstructionBusiness`, `ProfessionalService`, …) and none of them
 * describe domestic cleaning. schema.org's own worked example for a cleaning
 * company uses plain `LocalBusiness` for the company and puts "cleaning" on the
 * `Service` nodes via `serviceType`, which is exactly what this folder does —
 * see `./service.tsx`. Emitting an invented `@type` would be invalid structured
 * data, and invalid structured data is ignored at best.
 *
 * ## What is deliberately missing
 *
 * Everything not backed by a real fact (`.agents/DECISIONS.md`):
 *
 * | Omitted | Why |
 * | --- | --- |
 * | `address` / `PostalAddress` | No street address exists. A fabricated one is a manual-action risk. |
 * | `openingHours`, `openingHoursSpecification` | No published hours. |
 * | `priceRange` | No prices anywhere; quotes are given after contact. |
 * | `sameAs` | No social profiles exist. |
 * | `aggregateRating`, `review` | No reviews. Inventing them is the single fastest way to earn a structured-data penalty. |
 * | `geo`, `hasMap` | No location to point at. |
 * | `legalName`, `vatID`, `taxID`, `foundingDate` | No company registration in the source material. |
 *
 * `logo` is the one entry that graduated off that list: the lockup now ships as
 * a fetchable file, so it is emitted by default — see `DEFAULT_LOGO_URL`.
 *
 * If a fact later becomes real, add the field here — not at a call site.
 */

/**
 * The lockup a crawler can actually fetch.
 *
 * PNG rather than `logo.svg`, deliberately: several consumers of the
 * structured-data `logo` field — Google's own rich-result tooling among them —
 * will not rasterise SVG, and a `logo` they cannot decode is a `logo` they
 * drop. `public/logo.png` is 1021×128, transparent, and the same outlines as
 * the SVG, so nothing is lost by pointing here. `logo-dark.png` exists for
 * dark surfaces but is never the structured-data one: consumers composite on
 * white.
 */
const DEFAULT_LOGO_URL = "/logo.png";

/** Language names for `availableLanguage`, in English as schema.org expects. */
const languageNames: Readonly<Record<Locale, string>> = {
  ro: "Romanian",
  ru: "Russian",
  en: "English",
};

export interface LocalBusinessJsonLdProps {
  readonly locale: Locale;
  /** The business name. Pass `t("meta.siteName")` or `t("common.brand")`. */
  readonly name: string;
  /** The city served, in this locale. Pass `t("common.city")`. */
  readonly city: string;
  /** One-line description. Pass `t("meta.description")`. */
  readonly description?: string;
  /**
   * Absolute URL or root-relative path of a fetchable logo file. Defaults to
   * `DEFAULT_LOGO_URL`; pass `null` to omit `logo` entirely.
   */
  readonly logoUrl?: string | null;
}

export function buildLocalBusinessNode({
  locale,
  name,
  city,
  description,
  logoUrl = DEFAULT_LOGO_URL,
}: LocalBusinessJsonLdProps): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "LocalBusiness",
    "@id": BUSINESS_NODE_ID,
    name,
    description,
    url: localeHomeUrl(locale),
    telephone: contact.phone.raw,
    email: contact.email.address,
    image: toAbsoluteUrl(ogImage.src),
    logo: logoUrl ? toAbsoluteUrl(logoUrl) : undefined,
    areaServed: { "@type": "City", name: city },
    // `availableLanguage` belongs to `ContactPoint`, not to `LocalBusiness`
    // itself, so the languages the company answers in are declared alongside
    // the channels they are answered on.
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: contact.phone.raw,
      email: contact.email.address,
      areaServed: { "@type": "City", name: city },
      availableLanguage: locales.map((code) => ({
        "@type": "Language",
        name: languageNames[code],
        alternateName: localeHtmlLang[code],
      })),
    },
  };
}

/** Render the `LocalBusiness` node. See the module comment before adding fields. */
export function LocalBusinessJsonLd(props: LocalBusinessJsonLdProps) {
  return <JsonLd node={buildLocalBusinessNode(props)} />;
}
