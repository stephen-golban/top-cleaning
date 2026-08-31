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
    return legacyRedirects.map((redirect) => ({ ...redirect, permanent: true }));
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
    ];
  },
};

export default withNextIntl(nextConfig);
