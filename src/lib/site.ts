/**
 * Single source of truth for the deployment's absolute base URL.
 *
 * `NEXT_PUBLIC_SITE_URL` must be set in every environment (see `.env.example`).
 * Falling back to localhost keeps `next build` and local dev working without it,
 * but production deploys should always set it — canonical URLs, hreflang
 * alternates, the sitemap and OpenGraph images all derive from this value.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Base URL with any trailing slash removed, e.g. `https://topcleaning.md`. */
export const siteUrl = rawSiteUrl.replace(/\/+$/, "");

export const siteUrlObject = new URL(siteUrl);

/** Build an absolute URL from a site-root-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${siteUrl}/`).toString();
}
