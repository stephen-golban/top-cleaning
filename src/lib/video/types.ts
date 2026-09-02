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

/** Everything about a link except how its secret is stored. */
interface VideoLinkBody {
  /** Optional heading shown above the player. */
  title?: LocalizedText;
  /** Optional paragraph shown under the heading. */
  description?: LocalizedText;
  /** Ordered list of videos. One entry is the common case. */
  clips: VideoClip[];
}

/**
 * One secret link: a secret plus the ordered clips it plays.
 *
 * The secret is carried one of two ways, and the type is a union so that a
 * given entry has to pick one:
 *
 * - `tokenHash` — the base64url SHA-256 of the token. **This is the only form
 *   allowed in `src/lib/video/links.ts`**, which is committed to a public
 *   repository. `loadVideoCatalog` drops any file entry that ships a plaintext
 *   `token`, because that would publish the password.
 * - `token` — the secret itself. Legal only in `PRIVATE_VIDEO_LINKS`, which is
 *   a Worker secret and therefore a private place, and convenient in tests.
 *
 * Both resolve identically: a request's token is hashed and compared against
 * the entry's hash. See `src/lib/video/catalog.ts`.
 */
export type VideoLink = VideoLinkBody &
  ({ tokenHash: string; token?: undefined } | { token: string; tokenHash?: undefined });

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
