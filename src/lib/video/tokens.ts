/**
 * Secret link tokens.
 *
 * A token is the whole of the first gate: whoever holds it can open the page.
 * So it has to be long enough that guessing is hopeless, and compared in a way
 * that does not let an attacker walk the catalog one character at a time by
 * timing the response.
 */

/** Bytes of entropy per generated token. 24 bytes = 192 bits. */
export const TOKEN_BYTES = 24;

/**
 * Minimum accepted length in base64url characters. 22 characters carries 132
 * bits, comfortably over the 128-bit floor the brief sets.
 */
export const MIN_TOKEN_LENGTH = 22;
export const MAX_TOKEN_LENGTH = 128;

const TOKEN_PATTERN = new RegExp(
  `^[A-Za-z0-9_-]{${MIN_TOKEN_LENGTH},${MAX_TOKEN_LENGTH}}$`,
);

/** URL-safe base64, no padding — the encoding used for both tokens and hashes. */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Cryptographically random, URL-safe, no padding. */
export function generateToken(bytes: number = TOKEN_BYTES): string {
  if (bytes < 16) throw new Error("tokens need at least 16 bytes of entropy");
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * Shape check only. The token alphabet and length range are public knowledge —
 * rejecting a malformed request early leaks nothing an attacker could not read
 * off a QR code they already have.
 */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/* -------------------------------------------------------------------------- */
/* Hashing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * SHA-256 of a token, base64url encoded: 32 bytes -> 43 characters.
 *
 * This is what `src/lib/video/links.ts` stores instead of the token itself.
 * That file is committed to a **public** GitHub repository, so a plaintext
 * token there is a published password: gate 1 of the three (an unguessable
 * link) collapses, and gate 2 collapses with it, because our own server will
 * cheerfully sign a playback JWT for anybody who presents a token it recognises.
 * A hash keeps the file honest — it is enough to *recognise* the token the
 * visitor brings, and not enough to *produce* one.
 *
 * Unsalted and uniterated on purpose. A password hash needs a salt and a work
 * factor because passwords are guessable; a token from `generateToken` carries
 * 192 bits of uniform randomness, so there is no dictionary to try and nothing
 * for a rainbow table to precompute. What would actually be wrong here is a
 * *slow* hash: this runs on the request path, once per catalog entry.
 */
export const TOKEN_HASH_LENGTH = 43;

const TOKEN_HASH_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_HASH_LENGTH}}$`);

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

/** Shape check for a stored `tokenHash`. Reveals nothing; the hash is public. */
export function isWellFormedTokenHash(value: unknown): value is string {
  return typeof value === "string" && TOKEN_HASH_PATTERN.test(value);
}

/* -------------------------------------------------------------------------- */
/* Constant-time comparison                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Per-isolate random key for double-HMAC comparison. Comparing HMACs instead of
 * the strings themselves is constant-time regardless of input length, and the
 * key is unknown to the attacker so the digests carry no exploitable structure.
 */
let comparisonKey: Promise<CryptoKey> | null = null;

function getComparisonKey(): Promise<CryptoKey> {
  comparisonKey ??= crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return comparisonKey;
}

async function digest(key: CryptoKey, value: string): Promise<Uint8Array> {
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return new Uint8Array(mac);
}

/** XOR-accumulating compare over two equal-length digests. No early exit. */
function equalDigests(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Constant-time string equality. */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = await getComparisonKey();
  const [da, db] = await Promise.all([digest(key, a), digest(key, b)]);
  return equalDigests(da, db);
}

/**
 * Find `candidate` in `values`, scanning every entry even after a hit so the
 * response time does not reveal where in the catalog a token lives — or whether
 * it matched at all.
 *
 * @returns the index of the match, or -1.
 */
export async function timingSafeIndexOf(
  candidate: string,
  values: readonly string[],
): Promise<number> {
  const key = await getComparisonKey();
  const target = await digest(key, candidate);
  const digests = await Promise.all(values.map((value) => digest(key, value)));

  let found = -1;
  for (let i = 0; i < digests.length; i += 1) {
    const isMatch = equalDigests(target, digests[i]!);
    // Branchless-ish: never break, and only the first match wins.
    found = isMatch && found === -1 ? i : found;
  }
  return found;
}
