import type { Locale } from "../../i18n/routing";

/** A string per locale. Any subset is legal; missing locales fall back. */
export type LocalizedText = Partial<Record<Locale, string>>;

/** One Cloudflare Stream video inside a link. */
export interface VideoClip {
  /** Cloudflare Stream video UID — 32 hex characters. */
  uid: string;
  /** Optional per-locale title. Falls back to "Video 1", "Video 2", … */
  title?: LocalizedText;
  /** Second of the video used for the poster frame. Defaults to 1. */
  posterTime?: number;
}

/** One secret link: a token plus the ordered clips it plays. */
export interface VideoLink {
  /** The secret. URL-safe, >= 22 characters. Generate with `pnpm video:token`. */
  token: string;
  /** Optional heading shown above the player. */
  title?: LocalizedText;
  /** Optional paragraph shown under the heading. */
  description?: LocalizedText;
  /** Ordered list of videos. One entry is the common case. */
  clips: VideoClip[];
}

/** Order used when a locale has no translation for a given field. */
export const FALLBACK_LOCALES = ["ro", "en", "ru"] as const;

/** Pick the best available translation, or `undefined` if there is none. */
export function pickLocalized(
  text: LocalizedText | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return undefined;
  const direct = text[locale]?.trim();
  if (direct) return direct;
  for (const fallback of FALLBACK_LOCALES) {
    const value = text[fallback]?.trim();
    if (value) return value;
  }
  return undefined;
}
