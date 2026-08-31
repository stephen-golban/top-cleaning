import { siteUrl } from "@/lib/site";

/**
 * Stable `@id`s for the two JSON-LD nodes that describe the site itself.
 *
 * They are fragment URIs on the site root and are deliberately *not* localized:
 * there is one business and one website, described in three languages. Keeping
 * the ids constant is what lets a `Service` node on `/en/services/…` say
 * `"provider": { "@id": … }` and have it resolve to the `LocalBusiness` node
 * rendered by the layout on that same page.
 */
export const BUSINESS_NODE_ID = `${siteUrl}/#business`;
export const WEBSITE_NODE_ID = `${siteUrl}/#website`;
