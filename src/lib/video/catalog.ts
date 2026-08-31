import { isWellFormedToken, timingSafeIndexOf } from "./tokens";
import type { LocalizedText, VideoClip, VideoLink } from "./types";
import { videoLinks as fileVideoLinks } from "./links";

/**
 * The catalog is the mapping from secret token to video. It comes from two
 * places, in this order:
 *
 *   1. `src/lib/video/links.ts` — checked in, edited by hand, the normal path.
 *   2. `PRIVATE_VIDEO_LINKS` — a JSON array in the environment, so a link can be
 *      added or revoked with `wrangler secret put` instead of a code change.
 *
 * Environment entries win on token collision. Everything is validated before it
 * is trusted: a typo must not be able to quietly create a short, guessable link.
 */

const STREAM_UID_PATTERN = /^[a-f0-9]{32}$/i;
const LOCALE_KEYS = new Set(["ro", "ru", "en"]);

export type CatalogWarning = { index: number; problem: string };

/**
 * Validate an unknown value into `VideoLink[]`.
 *
 * Invalid entries are dropped rather than thrown, so one bad entry cannot take
 * the whole site down — but every drop is reported through `warnings` so the
 * operator finds out. Warnings deliberately never include the token itself.
 */
export function parseVideoLinks(value: unknown): {
  links: VideoLink[];
  warnings: CatalogWarning[];
} {
  const warnings: CatalogWarning[] = [];
  if (!Array.isArray(value)) {
    return { links: [], warnings: [{ index: -1, problem: "not a JSON array" }] };
  }

  const links: VideoLink[] = [];

  value.forEach((raw, index) => {
    const problem = validateLink(raw);
    if (problem) {
      warnings.push({ index, problem });
      return;
    }
    links.push(normalizeLink(raw as VideoLink));
  });

  return { links, warnings };
}

function validateLink(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return "entry is not an object";
  const link = raw as Partial<VideoLink>;

  if (!isWellFormedToken(link.token)) {
    return "token is missing, too short, or uses characters outside [A-Za-z0-9_-]";
  }
  if (!Array.isArray(link.clips) || link.clips.length === 0) {
    return "clips must be a non-empty array";
  }
  for (const clip of link.clips) {
    if (typeof clip !== "object" || clip === null) return "clip is not an object";
    const { uid, posterTime } = clip as Partial<VideoClip>;
    if (typeof uid !== "string" || !STREAM_UID_PATTERN.test(uid)) {
      return "clip.uid must be a 32-character Cloudflare Stream UID";
    }
    if (
      posterTime !== undefined &&
      (typeof posterTime !== "number" || !Number.isFinite(posterTime) || posterTime < 0)
    ) {
      return "clip.posterTime must be a non-negative number of seconds";
    }
    if (!isLocalizedText((clip as Partial<VideoClip>).title)) {
      return "clip.title must be an object of locale -> string";
    }
  }
  if (!isLocalizedText(link.title))
    return "title must be an object of locale -> string";
  if (!isLocalizedText(link.description)) {
    return "description must be an object of locale -> string";
  }
  return null;
}

function isLocalizedText(value: unknown): value is LocalizedText | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([key, text]) => LOCALE_KEYS.has(key) && typeof text === "string",
  );
}

function normalizeLink(link: VideoLink): VideoLink {
  return {
    token: link.token,
    ...(link.title ? { title: link.title } : {}),
    ...(link.description ? { description: link.description } : {}),
    clips: link.clips.map((clip) => ({
      uid: clip.uid.toLowerCase(),
      ...(clip.title ? { title: clip.title } : {}),
      ...(clip.posterTime !== undefined ? { posterTime: clip.posterTime } : {}),
    })),
  };
}

/** Later sources override earlier ones on matching token. */
export function mergeVideoLinks(...sources: readonly VideoLink[][]): VideoLink[] {
  const byToken = new Map<string, VideoLink>();
  for (const source of sources) {
    for (const link of source) byToken.set(link.token, link);
  }
  return [...byToken.values()];
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

let cachedCatalog: VideoLink[] | null = null;
let cachedEnvValue: string | undefined;

function reportWarnings(source: string, warnings: CatalogWarning[]): void {
  for (const warning of warnings) {
    console.warn(
      `[video] ignoring ${source} entry ${warning.index}: ${warning.problem}`,
    );
  }
}

/**
 * Build the catalog for the current environment.
 *
 * Cached per environment value so a warm isolate does not re-parse and re-warn
 * on every request; changing `PRIVATE_VIDEO_LINKS` invalidates the cache.
 */
export function loadVideoCatalog(
  env: Record<string, string | undefined> = process.env,
): VideoLink[] {
  const rawEnv = env.PRIVATE_VIDEO_LINKS;
  if (cachedCatalog && cachedEnvValue === rawEnv) return cachedCatalog;

  const fromFile = parseVideoLinks(fileVideoLinks);
  reportWarnings("links.ts", fromFile.warnings);

  let fromEnv: VideoLink[] = [];
  if (rawEnv && rawEnv.trim()) {
    try {
      const parsed = parseVideoLinks(JSON.parse(rawEnv) as unknown);
      reportWarnings("PRIVATE_VIDEO_LINKS", parsed.warnings);
      fromEnv = parsed.links;
    } catch {
      console.warn("[video] PRIVATE_VIDEO_LINKS is not valid JSON; ignoring it");
    }
  }

  cachedCatalog = mergeVideoLinks(fromFile.links, fromEnv);
  cachedEnvValue = rawEnv;
  return cachedCatalog;
}

/** Test seam — drops the memoised catalog. */
export function resetVideoCatalogCache(): void {
  cachedCatalog = null;
  cachedEnvValue = undefined;
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a URL token to its link, in constant time with respect to the
 * catalog's contents.
 *
 * Returns `null` for anything that does not match — malformed, unknown, or
 * revoked all look identical to the caller, and the caller renders the same
 * 404 for all three.
 */
export async function resolveVideoLink(
  token: string,
  links: readonly VideoLink[] = loadVideoCatalog(),
): Promise<VideoLink | null> {
  if (!isWellFormedToken(token)) return null;
  if (links.length === 0) return null;

  const index = await timingSafeIndexOf(
    token,
    links.map((link) => link.token),
  );
  return index === -1 ? null : (links[index] ?? null);
}
