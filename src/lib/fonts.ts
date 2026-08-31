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
 * `subsets` is therefore not decoration — but it does not mean what its name
 * suggests. It controls which subsets get a `<link rel="preload">`, not which
 * `@font-face` blocks exist: `next/font` emits every subset Google publishes
 * (latin, latin-ext, greek, cyrillic, cyrillic-ext, vietnamese) with its own
 * `unicode-range`, whatever `subsets` says. Russian therefore still renders in
 * real Commissioner and Literata with `subsets: ["latin", "latin-ext"]` below;
 * the Cyrillic file is simply fetched when the first Cyrillic glyph is laid
 * out rather than preloaded on every page in every language.
 *
 * That distinction is worth 54 KB on the critical path of every RO and EN page
 * — Cyrillic they never draw a glyph from — and 72 KB of Latin Extended on
 * every RU page. See `.agents/QA-REPORT.md` for the measured effect.
 *
 * `CyrillicIsStillOnOffer` below keeps the guarantee the `subsets` list used to
 * carry implicitly: if either family ever stops publishing Cyrillic,
 * `pnpm typecheck` fails instead of `/ru` quietly rendering in Georgia.
 */

/** The subset names a `next/font/google` family accepts. */
type SubsetsOf<F extends (options: never) => unknown> = NonNullable<
  NonNullable<Parameters<F>[0]>["subsets"]
>[number];

type Assert<T extends true> = T;

/**
 * The HARD CONSTRAINT from `.agents/DECISIONS.md`, as a compile-time check:
 * both families must still publish a Cyrillic subset, or `/ru` regresses to
 * the fallback-font bug the old site shipped.
 */
export type CyrillicIsStillOnOffer = [
  Assert<"cyrillic" extends SubsetsOf<typeof Commissioner> ? true : false>,
  Assert<"cyrillic" extends SubsetsOf<typeof Literata> ? true : false>,
];

/*
 * The fallback stacks below are written out at each call site rather than
 * hoisted into a shared constant. `next/font` is a compile-time transform: it
 * reads the options object out of the AST, so every value has to be a literal.
 * A spread of a `const` array parses, type-checks and lints cleanly, then fails
 * `next build` with "Unexpected spread".
 */

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
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans-face",
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
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-serif-face",
  preload: true,
  fallback: [
    "Iowan Old Style",
    "Palatino Linotype",
    "Palatino",
    "Georgia",
    "Times New Roman",
    "serif",
  ],
});

/** Applied together on `<html>`; both expose only CSS variables. */
export const fontVariables = `${sans.variable} ${serif.variable}`;
