import { Inter } from "next/font/google";

/**
 * Self-hosted by `next/font` at build time — no runtime request to Google.
 *
 * Subsets cover every glyph the three locales need:
 *  - `latin`        → English
 *  - `latin-ext`    → Romanian diacritics (ă â î ș ț)
 *  - `cyrillic`     → Russian
 */
export const sans = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});
