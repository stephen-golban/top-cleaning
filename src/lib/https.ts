/**
 * How a request actually reached us, and what to say about HTTPS on the way out.
 *
 * Shared by `next.config.ts` (which turns these into declarative `has` rules)
 * and `src/middleware.ts` (which needs the same answer in real code). One
 * definition, because a mismatch between the two is exactly the kind of thing
 * that silently half-works.
 */

/** Cloudflare's two accounts of the scheme the browser actually spoke. */
export const FORWARDED_PROTO_HEADER = "x-forwarded-proto";
export const CF_VISITOR_HEADER = "cf-visitor";

/**
 * One year, subdomains included, **no `preload`**.
 *
 * `preload` bakes the domain into a list compiled into Chrome, Firefox, Safari
 * and Edge. Removal takes months and only reaches a user when they update their
 * browser, so it belongs to whoever owns the domain, not to a deploy script.
 * `.agents/FOLLOWUPS.md` records it as an option.
 *
 * `includeSubDomains` is safe here because the zone has exactly one other
 * hostname — `www`, a Custom Domain on this same Worker, HTTPS-only. (The `MX`
 * records point at Cloudflare Email Routing, which is not HTTP.) Adding an
 * http-only subdomain later would break it; that is the trade this makes.
 */
/**
 * Lowercase on purpose, and it must stay that way.
 *
 * This header is set twice — once by `next.config.ts`, once by
 * `src/middleware.ts` — and OpenNext merges the two into a plain object before
 * building the response (`routingHandler.js`). Object keys are case-sensitive;
 * HTTP header names are not. `Headers.set` in the middleware normalises to
 * lowercase, so a capitalised key in the config does not collide with it: both
 * survive the merge and Cloudflare joins them into the single nonsense value
 * `max-age=31536000; includeSubDomains, max-age=31536000; includeSubDomains`.
 * One spelling, one header.
 */
export const HSTS_HEADER = "strict-transport-security";
export const HSTS_VALUE = "max-age=31536000; includeSubDomains";

/**
 * A `has`/`missing` matcher value for one of the scheme headers.
 *
 * **The anchors are load-bearing.** These strings are compiled to a `RegExp` by
 * two different matchers, and they do not agree:
 *
 *  - Next's own `matchHas` wraps the value: `new RegExp("^" + value + "$")`
 *    (`next/dist/shared/lib/router/utils/prepare-destination.js`). This is what
 *    runs under `next dev` and `next start`.
 *  - OpenNext's `routeHasMatcher` does **not**: `new RegExp(value)`, a bare
 *    substring test (`@opennextjs/aws/dist/core/routing/matcher.js`). This is
 *    what runs on Cloudflare.
 *
 * So an unanchored `"http"` matches the header value `https` on Cloudflare
 * while correctly failing to match it locally. That shipped for four minutes on
 * 2026-09-01 and put every HTTPS request into an infinite redirect to itself;
 * see `.agents/DEPLOY.md`. Anchoring here satisfies both — Next's wrapper turns
 * it into `^^http$$`, where the doubled anchors are zero-width and harmless.
 *
 * `src/lib/https.test.mts` asserts this against both matchers.
 */
export const forwardedProtoPattern = (scheme: Scheme) => `^${scheme}$`;

/** The same, for `cf-visitor`, whose value is a JSON object. Braces escaped: it is a regex. */
export const cfVisitorPattern = (scheme: Scheme) =>
  String.raw`^\{"scheme":"${scheme}"\}$`;

export type Scheme = "http" | "https";

/**
 * The scheme the browser used, or `null` when nothing authoritative says.
 *
 * Deliberately **not** derived from `request.url`. Inside a Worker that reports
 * `https:` whatever the client actually spoke, so trusting it would mean never
 * detecting cleartext.
 *
 * `null` is the honest answer under `pnpm dev` and `pnpm preview`, where
 * neither header exists — callers must treat it as "do nothing", which is what
 * keeps `http://localhost:3000` working.
 */
export function requestScheme(headers: Headers): Scheme | null {
  const forwarded = headers.get(FORWARDED_PROTO_HEADER);
  if (forwarded === "http" || forwarded === "https") return forwarded;

  // Only consult `cf-visitor` when the primary is absent entirely, so the two
  // can never disagree. Mirrors the `missing` guard on the config rules.
  if (forwarded === null) {
    const visitor = headers.get(CF_VISITOR_HEADER);
    if (visitor !== null) {
      try {
        const { scheme } = JSON.parse(visitor) as { scheme?: unknown };
        if (scheme === "http" || scheme === "https") return scheme;
      } catch {
        // A `cf-visitor` we cannot parse tells us nothing. Fall through.
      }
    }
  }

  return null;
}
