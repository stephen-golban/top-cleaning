import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
