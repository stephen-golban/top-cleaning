/**
 * Cloudflare Stream — server-side signed playback.
 *
 * Every private video is uploaded with `requireSignedURLs: true`, which makes
 * Cloudflare itself refuse any playback request that does not carry a valid,
 * unexpired JWT signed by one of the account's Stream signing keys. That is the
 * real security boundary: a leaked `/v/<token>` URL only buys someone the
 * ability to ask *us* for a token, and the tokens we mint expire in hours.
 *
 * Everything in this module is server-only. It reads secrets from `process.env`
 * and must never be imported from a `"use client"` module — the guard below
 * turns that mistake into a loud crash instead of a silent secret leak.
 *
 * Signing uses Web Crypto (`crypto.subtle`) rather than `node:crypto` because
 * this runs on the Cloudflare Workers runtime via OpenNext.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/stream.ts is server-only and was imported into a client bundle.",
  );
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

/** Default lifetime of a minted playback token. Short by design. */
export const DEFAULT_PLAYBACK_TTL_SECONDS = 2 * 60 * 60;

/** Cloudflare rejects `exp` more than 24h in the future. */
export const MAX_PLAYBACK_TTL_SECONDS = 24 * 60 * 60;

/** Tolerance for clock skew between us and Cloudflare's edge. */
const NBF_SKEW_SECONDS = 60;

/**
 * Legacy delivery host. Works for every account, but Cloudflare recommends the
 * per-account `customer-<CODE>.cloudflarestream.com` form — set
 * `CF_STREAM_CUSTOMER_SUBDOMAIN` to use it.
 */
export const DEFAULT_DELIVERY_HOST = "videodelivery.net";

export type StreamConfig = {
  /** Stream signing key ID (`CF_STREAM_SIGNING_KEY_ID`). */
  keyId: string;
  /** PKCS#8 PEM private key text, already normalised. */
  privateKeyPem: string;
  /** Host videos are delivered from, e.g. `customer-abc123.cloudflarestream.com`. */
  deliveryHost: string;
  /** Lifetime of minted playback tokens, in seconds. */
  ttlSeconds: number;
};

export type StreamConfigResult =
  { ok: true; config: StreamConfig } | { ok: false; reason: string };

/**
 * Read Stream configuration from the environment.
 *
 * Returns a result rather than throwing so callers can fail closed (render the
 * generic "link is not valid" page) while logging a precise, secret-free reason
 * for the operator. `reason` never contains any part of a key.
 */
export function readStreamConfig(
  env: Record<string, string | undefined> = process.env,
): StreamConfigResult {
  const keyId = env.CF_STREAM_SIGNING_KEY_ID?.trim();
  const rawPem = env.CF_STREAM_SIGNING_KEY_PEM?.trim();

  if (!keyId) return { ok: false, reason: "CF_STREAM_SIGNING_KEY_ID is not set" };
  if (!rawPem) return { ok: false, reason: "CF_STREAM_SIGNING_KEY_PEM is not set" };

  let privateKeyPem: string;
  try {
    privateKeyPem = normalizePrivateKeyPem(rawPem);
  } catch (error) {
    return {
      ok: false,
      reason: `CF_STREAM_SIGNING_KEY_PEM is malformed: ${(error as Error).message}`,
    };
  }

  const host = env.CF_STREAM_CUSTOMER_SUBDOMAIN?.trim();
  if (host && !/^[a-z0-9.-]+$/i.test(host)) {
    return { ok: false, reason: "CF_STREAM_CUSTOMER_SUBDOMAIN is not a bare hostname" };
  }

  return {
    ok: true,
    config: {
      keyId,
      privateKeyPem,
      deliveryHost: host || DEFAULT_DELIVERY_HOST,
      ttlSeconds: readTtlSeconds(env.CF_STREAM_TOKEN_TTL_SECONDS),
    },
  };
}

function readTtlSeconds(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PLAYBACK_TTL_SECONDS;
  return Math.min(parsed, MAX_PLAYBACK_TTL_SECONDS);
}

/* -------------------------------------------------------------------------- */
/* PEM handling                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Accept the three shapes the signing key realistically arrives in:
 *
 *  1. the base64 blob Cloudflare's `/stream/keys` endpoint returns in `pem`;
 *  2. a literal PEM block;
 *  3. a PEM block whose newlines were escaped as `\n` by a shell or dashboard.
 */
export function normalizePrivateKeyPem(raw: string): string {
  const unescaped = raw.trim().replace(/\\n/g, "\n");
  if (unescaped.includes("-----BEGIN")) return assertPkcs8(unescaped);

  const decoded = new TextDecoder().decode(base64ToBytes(unescaped));
  if (decoded.includes("-----BEGIN")) return assertPkcs8(decoded.trim());

  throw new Error("expected a PEM block or a base64-encoded PEM block");
}

function assertPkcs8(pem: string): string {
  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "key is PKCS#1; Web Crypto needs PKCS#8 (`openssl pkcs8 -topk8 -nocrypt`)",
    );
  }
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("expected a `BEGIN PRIVATE KEY` (PKCS#8) block");
  }
  return pem;
}

/** Strip the PEM armour and return the raw DER bytes. */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToBytes(body);
}

/* -------------------------------------------------------------------------- */
/* Base64 / base64url                                                         */
/* -------------------------------------------------------------------------- */

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8ToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

/* -------------------------------------------------------------------------- */
/* Signing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Imported keys are cached per PEM for the lifetime of the isolate. Importing an
 * RSA key is the expensive part of signing; the pages that call this mint one
 * token per clip on every request.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

async function importSigningKey(pem: string): Promise<CryptoKey> {
  const cached = keyCache.get(pem);
  if (cached) return cached;

  const der = pemToDer(pem);
  const promise = crypto.subtle
    .importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
      "sign",
    ])
    .catch((error: unknown) => {
      keyCache.delete(pem);
      throw error;
    });

  keyCache.set(pem, promise);
  return promise;
}

export type PlaybackTokenClaims = {
  sub: string;
  kid: string;
  exp: number;
  nbf: number;
  downloadable?: boolean;
  accessRules?: StreamAccessRule[];
};

export type StreamAccessRule = {
  type: "any" | "ip.src" | "ip.geoip.country";
  action: "allow" | "block";
  country?: string[];
  ip?: string[];
};

export type SignPlaybackTokenOptions = {
  /** Cloudflare Stream video UID. */
  videoUid: string;
  config: StreamConfig;
  /** Unix seconds. Injectable for tests. */
  now?: number;
  /** Overrides `config.ttlSeconds`. Clamped to Cloudflare's 24h maximum. */
  ttlSeconds?: number;
  /** Allow MP4 download of the signed video. Off by default — these are private. */
  downloadable?: boolean;
  accessRules?: StreamAccessRule[];
};

/**
 * Mint a short-lived RS256 playback JWT for one video.
 *
 * The token is what Cloudflare checks; it is scoped to a single video UID and
 * cannot be widened by the holder without invalidating the signature.
 */
export async function signPlaybackToken(
  options: SignPlaybackTokenOptions,
): Promise<string> {
  const { videoUid, config } = options;

  if (!/^[a-f0-9]{32}$/i.test(videoUid)) {
    throw new Error("videoUid must be a 32-character Cloudflare Stream UID");
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const ttl = Math.min(
    options.ttlSeconds ?? config.ttlSeconds,
    MAX_PLAYBACK_TTL_SECONDS,
  );

  const header = { alg: "RS256", kid: config.keyId };
  const claims: PlaybackTokenClaims = {
    sub: videoUid,
    kid: config.keyId,
    exp: now + ttl,
    nbf: now - NBF_SKEW_SECONDS,
  };
  if (options.downloadable) claims.downloadable = true;
  if (options.accessRules?.length) claims.accessRules = options.accessRules;

  const signingInput = `${utf8ToBase64Url(JSON.stringify(header))}.${utf8ToBase64Url(
    JSON.stringify(claims),
  )}`;

  const key = await importSigningKey(config.privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/** Decode a JWT's header and payload without verifying. Test/debug helper. */
export function decodeJwt(token: string): { header: unknown; payload: unknown } {
  const [header, payload] = token.split(".");
  if (!header || !payload) throw new Error("not a JWT");
  const decode = (part: string) =>
    JSON.parse(
      new TextDecoder().decode(
        base64ToBytes(part.replace(/-/g, "+").replace(/_/g, "/")),
      ),
    ) as unknown;
  return { header: decode(header), payload: decode(payload) };
}

/* -------------------------------------------------------------------------- */
/* Playback URLs                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Embeddable player URL. The signed token stands in for the video UID, so the
 * UID never appears in markup and the URL stops working when the token expires.
 */
export function iframeUrl(
  config: StreamConfig,
  signedToken: string,
  options: { autoplay?: boolean; muted?: boolean; poster?: string } = {},
): string {
  const url = new URL(`https://${config.deliveryHost}/${signedToken}/iframe`);
  url.searchParams.set("preload", "metadata");
  if (options.autoplay) url.searchParams.set("autoplay", "true");
  if (options.muted) url.searchParams.set("muted", "true");
  if (options.poster) url.searchParams.set("poster", options.poster);
  return url.toString();
}

/** Signed poster frame. Also gated by `requireSignedURLs`. */
export function thumbnailUrl(
  config: StreamConfig,
  signedToken: string,
  options: { timeSeconds?: number; height?: number; fit?: "crop" | "clip" } = {},
): string {
  const url = new URL(
    `https://${config.deliveryHost}/${signedToken}/thumbnails/thumbnail.jpg`,
  );
  url.searchParams.set("time", `${options.timeSeconds ?? 1}s`);
  url.searchParams.set("height", String(options.height ?? 720));
  if (options.fit) url.searchParams.set("fit", options.fit);
  return url.toString();
}

export function hlsManifestUrl(config: StreamConfig, signedToken: string): string {
  return `https://${config.deliveryHost}/${signedToken}/manifest/video.m3u8`;
}

export function dashManifestUrl(config: StreamConfig, signedToken: string): string {
  return `https://${config.deliveryHost}/${signedToken}/manifest/video.mpd`;
}
