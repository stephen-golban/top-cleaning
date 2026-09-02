import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import {
  CF_VISITOR_HEADER,
  FORWARDED_PROTO_HEADER,
  HSTS_HEADER,
  HSTS_VALUE,
  cfVisitorPattern,
  forwardedProtoPattern,
  type Scheme,
} from "./src/lib/https";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Permanent redirects from the previous topcleaning.md URL scheme.
 *
 * The old site (see `.agents/source-inventory.md` §3 and §10) served Romanian
 * unprefixed at `/` and Russian under `/ru`, with service detail pages beneath
 * `/servicii-de-curatenie/` and `/ru/uslugi-po-uborke/`. This one always
 * prefixes the locale and shortens the container segment to `/servicii` and
 * `/uslugi`. Every old path that changed is mapped to its new equivalent here.
 *
 * Sources are copied verbatim from the inventory, not reconstructed — they are
 * historical constants now and exist nowhere else in the codebase.
 *
 * Deliberately absent, because the path did not change and a redirect to itself
 * is an infinite loop:
 *   - `/ru` (old RU home)      → `/ru` today
 *   - `/ru/o-nas` (old RU about) → `/ru/o-nas` today
 * Also absent: the old RO home `/`, which the next-intl middleware already
 * redirects to `/ro` (`.agents/DECISIONS.md`).
 *
 * Order matters: Next matches these top to bottom, so the per-service entries
 * come before the catch-alls that sweep any remaining legacy service URL onto
 * the services index rather than a 404.
 *
 * `permanent: true` emits **308**, the modern permanent redirect. Google and
 * Bing treat it exactly as they treat 301 for consolidating link equity, and
 * unlike 301 it cannot be silently downgraded to a GET by an intermediary.
 *
 * These run before the middleware — Next's documented order is
 * `headers` → `redirects` → middleware — so a legacy path never reaches
 * next-intl's unknown-pathname handling.
 *
 * The destinations are cross-checked against the live route table by
 * `src/lib/seo/legacy-redirects.test.mts`; if a slug in `src/content/services.ts`
 * changes, that test fails rather than these redirects rotting into 404s.
 */
const legacyRedirects = [
  // --- Romanian: was served unprefixed at the site root ---
  { source: "/servicii-de-curatenie", destination: "/ro/servicii" },
  {
    source: "/servicii-de-curatenie/servicii-curatenie-generala",
    destination: "/ro/servicii/curatenie-generala",
  },
  {
    source: "/servicii-de-curatenie/servicii-curatenie-de-intretinere",
    destination: "/ro/servicii/curatenie-de-intretinere",
  },
  {
    source: "/servicii-de-curatenie/servicii-curatenie-dupa-reparatie",
    destination: "/ro/servicii/curatenie-dupa-reparatie",
  },
  {
    source: "/servicii-de-curatenie/servicii-curatarea-chimica-a-mobilierului-tapitat",
    destination: "/ro/servicii/curatare-chimica-mobilier-tapitat",
  },
  // Any other legacy RO service URL: the index is a better landing than a 404.
  { source: "/servicii-de-curatenie/:slug", destination: "/ro/servicii" },
  { source: "/despre-noi", destination: "/ro/despre-noi" },

  // --- Russian: was served under /ru, which is still the RU prefix today ---
  { source: "/ru/uslugi-po-uborke", destination: "/ru/uslugi" },
  {
    source: "/ru/uslugi-po-uborke/uslugi-generalnaya-uborka",
    destination: "/ru/uslugi/generalnaya-uborka",
  },
  {
    source: "/ru/uslugi-po-uborke/uslugi-podderzhivayushchaya-uborka",
    destination: "/ru/uslugi/podderzhivayushchaya-uborka",
  },
  {
    source: "/ru/uslugi-po-uborke/uslugi-uborka-posle-remonta",
    destination: "/ru/uslugi/uborka-posle-remonta",
  },
  {
    source: "/ru/uslugi-po-uborke/uslugi-himchistka-myagkoy-mebeli",
    destination: "/ru/uslugi/himchistka-myagkoy-mebeli",
  },
  { source: "/ru/uslugi-po-uborke/:slug", destination: "/ru/uslugi" },
] as const;

/**
 * `www.topcleaning.md` → `https://topcleaning.md`, one permanent hop.
 *
 * Both hostnames are attached to the Worker as Cloudflare Custom Domains, so
 * both would otherwise serve the site and Google would see two copies of it.
 * The canonical, hreflang and sitemap URLs are all built from
 * `NEXT_PUBLIC_SITE_URL`, so the apex is the canonical host and `www` has to
 * fold into it.
 *
 * This lives here rather than in a Cloudflare Redirect Rule because the
 * deploying OAuth token has zone *read* only: the Rulesets API refuses to write
 * (`10000 Authentication error`). Doing it in the app keeps the rule in version
 * control and applies it identically on every host the Worker answers on.
 *
 * The host is derived from `NEXT_PUBLIC_SITE_URL` rather than hard-coded, so a
 * staging deploy under another domain redirects its own `www`, and a local
 * build produces a `www.localhost:3000` matcher that never fires.
 *
 * Static assets under `/_next/static`, `/fonts` and `/images` are answered by
 * the Worker's ASSETS binding before any of this runs, so they still serve on
 * `www`. That is harmless — none of them are indexable documents.
 *
 * Two rules, not one, and that is not tidiness. A single `/:path*` rule matches
 * the bare root with `path` unset, and Next then emits the *literal* string
 * `https://topcleaning.md/:path*` as the Location header — verified against the
 * live deploy. `/:path+` requires at least one segment, so the root gets its own
 * rule and every deeper path gets the wildcard.
 */
const canonicalHost = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
).host;

const onWww = [{ type: "host" as const, value: `www.${canonicalHost}` }];

const wwwToApex = [
  {
    source: "/",
    has: onWww,
    destination: `https://${canonicalHost}/`,
    permanent: true,
  },
  {
    source: "/:path+",
    has: onWww,
    destination: `https://${canonicalHost}/:path+`,
    permanent: true,
  },
];

/**
 * Plain HTTP → HTTPS, and HSTS once we are there.
 *
 * Cloudflare answers `topcleaning.md` on both :80 and :443, and until this
 * existed the Worker happily served the whole site over cleartext with a 200 —
 * no upgrade, no HSTS. Every form post, including the quote form, was one
 * hostile network away from being read in transit.
 *
 * **This is in the app *as well as* the zone toggle, not instead of it.** When
 * this was written the deploying OAuth token had zone *read* only, so
 * `PATCH /zones/{id}/settings/always_use_https` answered `10000 Authentication
 * error` and the application was the only place the upgrade could live. The
 * zone toggle is **on** as of 2026-09-02, set with a token that carries Zone
 * Settings: Edit, and cleartext now gets a `301` from Cloudflare's edge before
 * the Worker is ever invoked. These rules stay anyway, and deleting them would
 * be a mistake: they are the version-controlled half, they survive somebody
 * flipping the dashboard switch back, and — unlike the edge rule — they are
 * paired with the `headers()` block below that actually ships HSTS. The two
 * layers are complementary; only the edge one reaches static assets and
 * Cloudflare's managed `/robots.txt`, and only this one is in git.
 *
 * **Why `redirects()` and not `src/middleware.ts`.** Next runs
 * `headers` → `redirects` → middleware, so a redirect here fires before
 * next-intl ever looks at the pathname: the upgrade costs one hop instead of
 * landing on a locale redirect first, and no `NEXT_LOCALE` cookie is minted on
 * a response the browser is only going to throw away. It also reaches paths the
 * middleware deliberately does not match — its matcher excludes anything with a
 * dot, i.e. `/robots.txt` and `/sitemap.xml`.
 *
 * **How the original scheme is detected.** Not from `request.url`. Inside a
 * Worker that reports `https:` whatever the client actually spoke, so trusting
 * it would mean never redirecting. Cloudflare's edge tells us instead, via
 * `x-forwarded-proto`, with `cf-visitor` as the fallback for the day it stops
 * sending the first one. `missing` guards the fallback so exactly one of the
 * two rules can ever match. The patterns and the escaping live in
 * `src/lib/https.ts`, together with the reason they are **anchored** — the two
 * matchers these strings pass through disagree about that, and getting it wrong
 * takes the site down. Read that note before touching them.
 *
 * **This is why it stays off in development.** Neither header exists on
 * `http://localhost:3000` under `pnpm dev`, nor on workerd under
 * `pnpm preview`, so no rule matches and local HTTP keeps working. There is no
 * `NODE_ENV` check because none is needed.
 *
 * The destination is the canonical host rather than the requesting one, so
 * `http://www.topcleaning.md/x` upgrades *and* folds to the apex in a single
 * hop. `https://www` is still handled by `wwwToApex` below. Two rules for the
 * same reason `wwwToApex` needs two — see the note there.
 *
 * Next carries the query string over to the destination itself, so
 * `?utm_source=…` survives the upgrade.
 */
const onScheme = (scheme: Scheme) => [
  {
    type: "header" as const,
    key: FORWARDED_PROTO_HEADER,
    value: forwardedProtoPattern(scheme),
  },
];

const onCfVisitorScheme = (scheme: Scheme) => [
  { type: "header" as const, key: CF_VISITOR_HEADER, value: cfVisitorPattern(scheme) },
];

/** Only consult `cf-visitor` when `x-forwarded-proto` is absent entirely. */
const noForwardedProto = [{ type: "header" as const, key: FORWARDED_PROTO_HEADER }];

const httpsRedirect = [
  {
    source: "/",
    has: onScheme("http"),
    destination: `https://${canonicalHost}/`,
    permanent: true,
  },
  {
    source: "/:path+",
    has: onScheme("http"),
    destination: `https://${canonicalHost}/:path+`,
    permanent: true,
  },
  {
    source: "/",
    has: onCfVisitorScheme("http"),
    missing: noForwardedProto,
    destination: `https://${canonicalHost}/`,
    permanent: true,
  },
  {
    source: "/:path+",
    has: onCfVisitorScheme("http"),
    missing: noForwardedProto,
    destination: `https://${canonicalHost}/:path+`,
    permanent: true,
  },
];

const hsts = [{ key: HSTS_HEADER, value: HSTS_VALUE }];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // --- legacy URL migration (owned by the SEO feature; see the note above) ---
  async redirects() {
    return [
      // Scheme first: it upgrades and folds `www` in one hop, and everything
      // below can then assume https.
      ...httpsRedirect,
      ...wwwToApex,
      ...legacyRedirects.map((redirect) => ({ ...redirect, permanent: true })),
    ];
  },

  // --- private video routes (owned by the video feature; see src/app/[locale]/v) ---
  // A page cannot set response headers in the App Router, so the `X-Robots-Tag`
  // that backs up the page's own `noindex` meta tag has to be declared here.
  async headers() {
    const noIndex = [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];

    return [
      // --- HTTPS enforcement (site-wide; see the note above `httpsRedirect`) ---
      // Header rules are additive rather than first-match, so these compose
      // with the `/v/` rules below instead of replacing them.
      //
      // These do *not* reach a response OpenNext returns early — a config
      // redirect or a next-intl locale redirect — because `routingHandler`
      // returns before it merges them. For the cleartext 308 that is exactly
      // what we want. For `https://topcleaning.md/` → `/ro` it is a gap, and
      // `src/middleware.ts` closes it.
      { source: "/:path*", has: onScheme("https"), headers: hsts },
      {
        source: "/:path*",
        has: onCfVisitorScheme("https"),
        missing: noForwardedProto,
        headers: hsts,
      },

      { source: "/v/:path*", headers: noIndex },
      { source: "/:locale(ro|ru|en)/v/:path*", headers: noIndex },

      // --- self-hosted webfonts (owned by scripts/build-fonts.py) ---
      // Every filename under /fonts carries a content hash, so the bytes behind
      // a URL never change and the response can be cached forever.
      //
      // This applies on the Node runtime (`next start`) only. On Cloudflare the
      // ASSETS binding answers `/fonts/*` before the Worker runs, so this rule
      // never sees the request; `public/_headers` is the file that governs
      // there, and it covers `/_next/static/*` and `/images/*` too. The two are
      // kept in step by hand — there is no shared source — so if you change the
      // policy for a path here, change it there as well.
      {
        source: "/fonts/:path*.woff2",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
