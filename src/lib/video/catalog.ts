import {
  TOKEN_HASH_LENGTH,
  hashToken,
  isWellFormedToken,
  isWellFormedTokenHash,
  timingSafeIndexOf,
} from "./tokens";
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
 *
 * **The catalog never holds a token in plaintext.** `links.ts` is committed to
 * a public repository, so it stores `tokenHash` — the base64url SHA-256 of the
 * token — and a file entry carrying a plaintext `token` is dropped rather than
 * served. Resolution hashes the token off the URL and compares hashes, so the
 * checked-in file is enough to *recognise* the secret and not enough to *make*
 * one. `PRIVATE_VIDEO_LINKS` is a Worker secret, so it may use either form.
 */

const STREAM_UID_PATTERN = /^[a-f0-9]{32}$/i;
const LOCALE_KEYS = new Set(["ro", "ru", "en"]);

export type CatalogWarning = { index: number; problem: string };

export type ParseOptions = {
  /**
   * Reject entries that carry a plaintext `token` instead of a `tokenHash`.
   *
   * Set when parsing `links.ts`, which is public. Left off for
   * `PRIVATE_VIDEO_LINKS` — a Worker secret, where plaintext is fine — and for
   * tests, which need to state a token and then look it up.
   */
  requireHashedTokens?: boolean;
};

/**
 * Validate an unknown value into `VideoLink[]`.
 *
 * Invalid entries are dropped rather than thrown, so one bad entry cannot take
 * the whole site down — but every drop is reported through `warnings` so the
 * operator finds out. Warnings deliberately never include the token itself.
 */
export function parseVideoLinks(
  value: unknown,
  options: ParseOptions = {},
): {
  links: VideoLink[];
  warnings: CatalogWarning[];
} {
  const warnings: CatalogWarning[] = [];
  if (!Array.isArray(value)) {
    return { links: [], warnings: [{ index: -1, problem: "not a JSON array" }] };
  }

  const links: VideoLink[] = [];

  value.forEach((raw, index) => {
    const problem = validateLink(raw, options);
    if (problem) {
      warnings.push({ index, problem });
      return;
    }
    links.push(normalizeLink(raw as VideoLink));
  });

  return { links, warnings };
}

function validateLink(raw: unknown, options: ParseOptions): string | null {
  if (typeof raw !== "object" || raw === null) return "entry is not an object";
  const link = raw as Partial<VideoLink>;

  const secretProblem = validateSecret(link, options);
  if (secretProblem) return secretProblem;
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

/**
 * Exactly one of `tokenHash` / `token`, and the right shape for whichever it is.
 *
 * The `requireHashedTokens` branch is the guard that keeps a secret out of git:
 * a plaintext token pasted into `links.ts` is refused outright, so the mistake
 * shows up as a dead link the operator investigates rather than as a password
 * quietly published to GitHub. Neither the token nor the hash appears in the
 * message.
 */
function validateSecret(
  link: Partial<VideoLink>,
  options: ParseOptions,
): string | null {
  const hasHash = link.tokenHash !== undefined;
  const hasToken = link.token !== undefined;

  if (hasHash && hasToken) return "set either tokenHash or token, not both";

  if (hasHash) {
    return isWellFormedTokenHash(link.tokenHash)
      ? null
      : `tokenHash must be ${TOKEN_HASH_LENGTH} base64url characters (the SHA-256 of the token)`;
  }

  if (!hasToken) return "entry has neither tokenHash nor token";

  if (options.requireHashedTokens) {
    return (
      "entry carries a plaintext token, and this source is public. " +
      "Store `tokenHash` instead — `pnpm video:token` prints it. " +
      "See .agents/video-setup.md step 8"
    );
  }

  return isWellFormedToken(link.token)
    ? null
    : "token is missing, too short, or uses characters outside [A-Za-z0-9_-]";
}

function isLocalizedText(value: unknown): value is LocalizedText | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([key, text]) => LOCALE_KEYS.has(key) && typeof text === "string",
  );
}

function normalizeLink(link: VideoLink): VideoLink {
  const secret =
    link.tokenHash !== undefined
      ? { tokenHash: link.tokenHash }
      : { token: link.token };
  return {
    ...secret,
    ...(link.title ? { title: link.title } : {}),
    ...(link.description ? { description: link.description } : {}),
    clips: link.clips.map((clip) => ({
      uid: clip.uid.toLowerCase(),
      ...(clip.title ? { title: clip.title } : {}),
      ...(clip.posterTime !== undefined ? { posterTime: clip.posterTime } : {}),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Match keys                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The value an entry is looked up by: always the token's SHA-256, whichever
 * form the entry stored it in.
 *
 * Reducing both forms to one key is what lets a `PRIVATE_VIDEO_LINKS` entry
 * written in plaintext still override — or be overridden by — a hashed entry
 * for the same link, and what lets resolution do a single constant-time sweep.
 */
export async function videoLinkKey(link: VideoLink): Promise<string> {
  return link.tokenHash ?? (await hashToken(link.token));
}

/** Later sources override earlier ones on matching token. */
export async function mergeVideoLinks(
  ...sources: readonly VideoLink[][]
): Promise<VideoLink[]> {
  const byKey = new Map<string, VideoLink>();
  for (const source of sources) {
    const keys = await Promise.all(source.map(videoLinkKey));
    source.forEach((link, index) => byKey.set(keys[index]!, link));
  }
  return [...byKey.values()];
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

/** The catalog plus its precomputed match keys, in the same order. */
type KeyedCatalog = { links: VideoLink[]; keys: string[] };

let cachedCatalog: Promise<KeyedCatalog> | null = null;
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
export function loadKeyedVideoCatalog(
  env: Record<string, string | undefined> = process.env,
): Promise<KeyedCatalog> {
  const rawEnv = env.PRIVATE_VIDEO_LINKS;
  if (cachedCatalog && cachedEnvValue === rawEnv) return cachedCatalog;

  cachedCatalog = buildCatalog(rawEnv);
  cachedEnvValue = rawEnv;
  return cachedCatalog;
}

async function buildCatalog(rawEnv: string | undefined): Promise<KeyedCatalog> {
  // `links.ts` is public, so it may only carry hashes.
  const fromFile = parseVideoLinks(fileVideoLinks, { requireHashedTokens: true });
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

  const links = await mergeVideoLinks(fromFile.links, fromEnv);
  return { links, keys: await Promise.all(links.map(videoLinkKey)) };
}

/** The catalog without its keys, for callers that only want the entries. */
export async function loadVideoCatalog(
  env: Record<string, string | undefined> = process.env,
): Promise<VideoLink[]> {
  return (await loadKeyedVideoCatalog(env)).links;
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
  links?: readonly VideoLink[],
): Promise<VideoLink | null> {
  if (!isWellFormedToken(token)) return null;

  const catalog = links
    ? { links, keys: await Promise.all(links.map(videoLinkKey)) }
    : await loadKeyedVideoCatalog();
  if (catalog.links.length === 0) return null;

  // Hash first, then sweep: the comparison is between two 43-character hashes,
  // so it costs the same whatever the token was, and `timingSafeIndexOf` keeps
  // scanning after a hit so the position of a match is not observable either.
  const index = await timingSafeIndexOf(await hashToken(token), catalog.keys);
  return index === -1 ? null : (catalog.links[index] ?? null);
}
