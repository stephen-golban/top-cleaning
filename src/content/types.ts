import type { Locale } from "@/i18n/routing";

/**
 * A value that exists in every locale.
 *
 * Using this instead of `Partial<Record<Locale, T>>` is what makes a missing
 * translation a compile error rather than an `undefined` that only shows up in
 * the browser: adding a locale to `routing.locales` breaks every entry that has
 * not been translated yet.
 */
export type Localized<T> = Readonly<Record<Locale, T>>;

/** Localized plain text — the common case. */
export type LocalizedText = Localized<string>;

/** A list that is guaranteed to have at least one entry. */
export type NonEmpty<T> = readonly [T, ...T[]];
