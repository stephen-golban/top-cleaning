import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
      { source: "/v/:path*", headers: noIndex },
      { source: "/:locale(ro|ru|en)/v/:path*", headers: noIndex },

      // --- self-hosted webfonts (owned by scripts/build-fonts.py) ---
      // Every filename under /fonts carries a content hash, so the bytes behind
      // a URL never change and the response can be cached forever.
      //
      // This applies on the Node runtime (`next start`). On Cloudflare it does
      // not: the ASSETS binding answers `/fonts/*` before the Worker runs, and
      // it sets `public, max-age=0, must-revalidate` on *every* static asset —
      // `/images/*` and `/_next/static/*` included, and `next/font`'s own files
      // before this migration. Overriding that is a `public/_headers` file and
      // a site-wide caching decision; see `.agents/FOLLOWUPS.md`.
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
