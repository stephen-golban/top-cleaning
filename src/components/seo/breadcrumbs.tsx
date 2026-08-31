import { toAbsoluteUrl } from "@/lib/seo/urls";
import { JsonLd, type JsonLdNode, SCHEMA_CONTEXT } from "./json-ld";

/**
 * `BreadcrumbList` — the trail Google renders in place of a raw URL in results.
 *
 * Pass the trail in order, starting at the locale home and ending at the
 * current page. Names should be the localized labels a visitor sees, so the
 * markup and the visible breadcrumb agree — Google treats a mismatch between
 * structured data and on-page content as a quality problem.
 *
 * Pages with no trail (the home page) should not render this at all.
 */
export interface BreadcrumbItem {
  /** The label shown to a visitor, in the page's locale. */
  readonly name: string;
  /** Absolute URL, or a root-relative path. */
  readonly url: string;
}

export interface BreadcrumbListJsonLdProps {
  readonly items: readonly BreadcrumbItem[];
}

export function buildBreadcrumbListNode({
  items,
}: BreadcrumbListJsonLdProps): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url),
    })),
  };
}

export function BreadcrumbListJsonLd(props: BreadcrumbListJsonLdProps) {
  if (props.items.length === 0) return null;
  return <JsonLd node={buildBreadcrumbListNode(props)} />;
}
