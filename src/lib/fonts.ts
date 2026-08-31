import { Commissioner, Literata } from "next/font/google";

/**
 * Both faces are downloaded at build time and self-hosted by `next/font`.
 * There is zero runtime request to Google, and no render-blocking webfont.
 *
 * HARD CONSTRAINT (see `.agents/DECISIONS.md`): the site ships three locales —
 * `ro` (Romanian, needs Latin Extended: ă â î ș ț), `ru` (Russian, needs
 * Cyrillic) and `en`. A face without a Cyrillic subset renders the entire
 * Russian site in a system fallback. That was the bug on the old site; it must
 * not ship again. Every family below was verified against the Google Fonts API
 * (`unicode-range` blocks) *and* at the glyph level against the actual `cmap`
 * of the woff2 files Google serves for the `latin`, `latin-ext` and `cyrillic`
 * subsets, using the real strings `Curățenie după reparație` and
 * `Уборка после ремонта`.
 *
 * `subsets` is therefore not decoration: dropping `cyrillic` here silently
 * breaks `/ru`. If a family ever stops advertising `cyrillic`, `next/font`'s
 * generated types will fail `pnpm typecheck` rather than fail quietly.
 */

const SANS_FALLBACK = [
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
  "Roboto",
  "Helvetica Neue",
  "Arial",
  "sans-serif",
] as const;

const SERIF_FALLBACK = [
  "Iowan Old Style",
  "Palatino Linotype",
  "Palatino",
  "Georgia",
  "Times New Roman",
  "serif",
] as const;

/**
 * Body / UI face.
 *
 * The approved deck used **Karla**, which ships `latin` + `latin-ext` ONLY —
 * no Cyrillic at any weight. It is disqualified by the rule above.
 * **Commissioner** is its closest sibling that passes: the same low-contrast
 * humanist grotesque with a tall x-height and open apertures, a single
 * variable `wght` axis (100–900), and a Cyrillic drawn as part of the family
 * rather than auto-extended.
 */
export const sans = Commissioner({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-sans-face",
  preload: true,
  fallback: [...SANS_FALLBACK],
});

/**
 * Display / wordmark face.
 *
 * **Literata** replaces the deck's Fraunces (disqualified: no Cyrillic, and
 * flagged as an overused default). It keeps the two properties Direction B
 * actually depends on — a calm, wide-set roman for the "Top Cleaning" lockup
 * and enough personality at 46px+ to carry the headings — and it is variable on
 * both `wght` and `opsz`, so `font-optical-sizing: auto` reproduces the deck's
 * optical-size behaviour instead of scaling one text design up to display size.
 */
export const serif = Literata({
  subsets: ["latin", "latin-ext", "cyrillic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-serif-face",
  preload: true,
  fallback: [...SERIF_FALLBACK],
});

/** Applied together on `<html>`; both expose only CSS variables. */
export const fontVariables = `${sans.variable} ${serif.variable}`;
