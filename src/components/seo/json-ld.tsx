/**
 * The `<script type="application/ld+json">` carrier every structured-data
 * component in this folder renders through.
 */

/** A JSON-LD value. `undefined` is allowed so callers can omit fields inline. */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue | undefined };

export interface JsonLdNode {
  readonly [key: string]: JsonLdValue | undefined;
}

/**
 * Serialize a node for embedding in HTML.
 *
 * `JSON.stringify` drops `undefined` members, which is what lets the components
 * write `...(logo ? { logo } : {})`-free code and simply pass `undefined` for a
 * field with no real data behind it.
 *
 * `<` is escaped to `<` so a string in the data can never close the script
 * element early — the one XSS vector a `ld+json` block has. The escape is
 * invisible to JSON parsers, so crawlers read the original character.
 */
export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}

export interface JsonLdProps {
  readonly node: JsonLdNode;
}

/**
 * Renders one JSON-LD node. A Server Component: it emits markup and nothing
 * else, so it adds no client JavaScript.
 */
export function JsonLd({ node }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(node) }}
    />
  );
}

/** `https://schema.org` — the `@context` every node in this folder declares. */
export const SCHEMA_CONTEXT = "https://schema.org";
