import type { Locale } from "@/i18n/routing";
import {
  sansCoverage,
  sansFiles,
  serifCoverage,
  serifFiles,
  type SansGlyph,
  type SerifGlyph,
} from "./fonts.generated";

/**
 * Both faces are subsetted and self-hosted from `public/fonts`. There is zero
 * runtime request to Google, and no render-blocking webfont.
 *
 * The `@font-face` blocks, their `unicode-range`s and the metric-matched
 * fallbacks live in `src/app/fonts.generated.css`; the files and their exact
 * glyph coverage live in `./fonts.generated.ts`. Both are written by
 * `scripts/build-fonts.py` (`pnpm fonts:build`) and committed — `pnpm build`
 * needs no Python. That script's header explains the subsetting choices.
 *
 * ## Why not `next/font/google`
 *
 * It was measured to be the whole performance gap. `next/font` emits an
 * `@font-face` per subset Google publishes and preloads a list fixed at import
 * time; the locale layout is one module shared by `ro`, `ru` and `en`, so every
 * page preloaded the same files. Romanian and English paid for a Cyrillic-ready
 * stylesheet they never drew from, and Russian paid 72 KB for Latin Extended it
 * never drew from — 160-214 KB of woff2 at High priority, queued ahead of the
 * hero image. `next/font` has no way to preload per locale.
 *
 * `fontPreloads` below is the thing that replaces it: the layout knows its
 * locale, so it preloads exactly the files that locale draws from.
 *
 * ## HARD CONSTRAINT (see `.agents/DECISIONS.md`)
 *
 * The site ships three locales — `ro` (needs Latin Extended: ă â î ș ț), `ru`
 * (needs Cyrillic) and `en`. A face without Cyrillic renders the entire Russian
 * site in a system fallback. That was the bug on the old site; it must not ship
 * again. `CyrillicIsStillOnOffer` and `RomanianDiacriticsStillFit` below are
 * the compile-time guard, and `fonts.test.mts` checks the same coverage against
 * every string in `messages/` and `src/content/` rather than against a handful
 * of samples.
 *
 * Note what those guards are checking *against*: `serifCoverage` and
 * `sansCoverage` are read back out of the `cmap` of the woff2 files that ship,
 * not restated from the subsetting request. If a subset silently loses a glyph,
 * `pnpm typecheck` fails.
 *
 * Missing a glyph is a quality failure, never a broken one: each
 * `@font-face`'s `unicode-range` is generated from that same `cmap`, so a
 * character the file cannot draw is not claimed by the family at all and falls
 * through to the next entry in the stack. Nothing ever renders as .notdef.
 */

/** A family's two subsets, in the order the layout should preload them. */
export const fontFamilies = { serif: serifFiles, sans: sansFiles } as const;

export interface FontPreload {
  readonly href: string;
  readonly bytes: number;
}

/**
 * The woff2 files a page in `locale` should preload, in priority order.
 *
 * Latin is on every page in every language: the wordmark is "Top Cleaning", the
 * phone number is digits and the language switcher offers "Română" and
 * "English". Cyrillic is added for `ru` only — and, crucially, is *not* added
 * for `ro` or `en`, where it still loads on demand for the one word "Русский"
 * in the language switcher rather than sitting on the critical path.
 */
export function fontPreloads(locale: Locale): readonly FontPreload[] {
  const latin: FontPreload[] = [
    { href: serifFiles.latin.file, bytes: serifFiles.latin.bytes },
    { href: sansFiles.latin.file, bytes: sansFiles.latin.bytes },
  ];

  if (locale !== "ru") return latin;

  return [
    ...latin,
    { href: serifFiles.cyrillic.file, bytes: serifFiles.cyrillic.bytes },
    { href: sansFiles.cyrillic.file, bytes: sansFiles.cyrillic.bytes },
  ];
}

/* ------------------------------------------------------------------------ *
 * Compile-time coverage guards
 * ------------------------------------------------------------------------ */

/** Splits a string literal type into the union of its characters. */
type CharsOf<S extends string> = S extends `${infer Head}${infer Rest}`
  ? Head | CharsOf<Rest>
  : never;

/**
 * A list of claims that must all hold. Each entry is constrained to `true`, so
 * a claim that fails reports itself where it is written rather than as a
 * mismatch on the whole tuple.
 */
type AllTrue<Claims extends readonly true[]> = Claims;

/** Every character of `S` is drawable in the display face. */
type Serif<S extends string> =
  CharsOf<S> extends SerifGlyph
    ? true
    : "this string has a character the Literata subset cannot draw — widen scripts/build-fonts.py and re-run pnpm fonts:build";

/** Every character of `S` is drawable in the body face. */
type Sans<S extends string> =
  CharsOf<S> extends SansGlyph
    ? true
    : "this string has a character the Commissioner subset cannot draw — widen scripts/build-fonts.py and re-run pnpm fonts:build";

/**
 * The HARD CONSTRAINT above, as a compile-time check, on real Russian strings
 * taken from `messages/ru.json` — including the ones `text-transform:
 * uppercase` produces from them, since the eyebrows are uppercased in CSS.
 *
 * Delete a Cyrillic subset, or let one lose a letter, and `pnpm typecheck`
 * fails here instead of `/ru` quietly rendering in Georgia.
 */
export type CyrillicIsStillOnOffer = AllTrue<
  [
    Serif<"Уборка после ремонта">,
    Sans<"Уборка после ремонта">,
    Serif<"УБОРКА ПОСЛЕ РЕМОНТА">,
    Sans<"УБОРКА ПОСЛЕ РЕМОНТА">,
    Serif<"Кишинёв">,
    Sans<"Кишинёв">,
    Serif<"Услуги">,
    Sans<"Услуги">,
    Serif<"Профессиональные услуги уборки в Кишинёве">,
    Sans<"Профессиональные услуги уборки в Кишинёве">,
    // The whole Russian alphabet, both cases, so a partial subset cannot pass.
    Serif<"абвгдеёжзийклмнопрстуфхцчшщъыьэюя">,
    Sans<"абвгдеёжзийклмнопрстуфхцчшщъыьэюя">,
    Serif<"АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ">,
    Sans<"АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ">,
  ]
>;

/**
 * The Romanian half of the same constraint. `ș` and `ț` are the comma-below
 * forms Romanian actually uses; the cedilla forms `ş ţ` are kept because pasted
 * text and older keyboards still produce them.
 */
export type RomanianDiacriticsStillFit = AllTrue<
  [
    Serif<"Curățenie după reparație în Chișinău">,
    Sans<"Curățenie după reparație în Chișinău">,
    Serif<"CURĂȚENIE DUPĂ REPARAȚIE ÎN CHIȘINĂU">,
    Sans<"CURĂȚENIE DUPĂ REPARAȚIE ÎN CHIȘINĂU">,
    Serif<"ăâîșț ĂÂÎȘȚ şţ ŞŢ">,
    Sans<"ăâîșț ĂÂÎȘȚ şţ ŞŢ">,
  ]
>;

/* Keeps the coverage strings from being tree-shaken out of the type graph and
   gives `fonts.test.mts` something to import. */
export const coverage = { serif: serifCoverage, sans: sansCoverage } as const;
