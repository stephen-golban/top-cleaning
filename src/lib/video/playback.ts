import type { Locale } from "../../i18n/routing";
import {
  iframeUrl,
  readStreamConfig,
  signPlaybackToken,
  thumbnailUrl,
} from "../stream";
import { pickLocalized } from "./types";
import type { VideoLink } from "./types";

/**
 * Turns a resolved `VideoLink` into props a client component can safely hold.
 *
 * Note what does *not* cross this boundary: the Stream video UID, the account
 * ID, the signing key. The browser only ever sees short-lived signed URLs, so a
 * page saved to disk or a URL copied out of devtools stops working within hours.
 */

/** One clip, ready to render. Contains no account identifiers. */
export type SignedClip = {
  /** Stable React key. Position-based; never the video UID. */
  key: string;
  title: string | undefined;
  iframeSrc: string;
  posterSrc: string;
};

export type SignedVideoLink = {
  title: string | undefined;
  description: string | undefined;
  clips: SignedClip[];
  /** Unix seconds at which the signed URLs stop working. */
  expiresAt: number;
};

/**
 * Mint signed playback + poster URLs for every clip in a link.
 *
 * Returns `null` if Stream is not configured or signing fails. Callers render
 * the same "link is not valid" 404 they render for an unknown token — a visitor
 * must not be able to tell a real-but-broken link from a fake one. The reason is
 * logged server-side instead (`wrangler tail`).
 */
export async function buildSignedPlayback(
  link: VideoLink,
  locale: Locale,
  env: Record<string, string | undefined> = process.env,
): Promise<SignedVideoLink | null> {
  const result = readStreamConfig(env);
  if (!result.ok) {
    console.error(`[video] cannot sign playback: ${result.reason}`);
    return null;
  }
  const config = result.config;
  const now = Math.floor(Date.now() / 1000);

  try {
    const clips = await Promise.all(
      link.clips.map(async (clip, index): Promise<SignedClip> => {
        const token = await signPlaybackToken({ videoUid: clip.uid, config, now });
        return {
          key: `clip-${index}`,
          title: pickLocalized(clip.title, locale),
          iframeSrc: iframeUrl(config, token),
          posterSrc: thumbnailUrl(config, token, {
            timeSeconds: clip.posterTime ?? 1,
            height: 720,
            fit: "crop",
          }),
        };
      }),
    );

    return {
      title: pickLocalized(link.title, locale),
      description: pickLocalized(link.description, locale),
      clips,
      expiresAt: now + config.ttlSeconds,
    };
  } catch (error) {
    console.error(`[video] signing failed: ${(error as Error).message}`);
    return null;
  }
}
