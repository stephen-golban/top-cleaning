import assert from "node:assert/strict";
import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  DEFAULT_DELIVERY_HOST,
  DEFAULT_PLAYBACK_TTL_SECONDS,
  MAX_PLAYBACK_TTL_SECONDS,
  dashManifestUrl,
  decodeJwt,
  hlsManifestUrl,
  iframeUrl,
  normalizePrivateKeyPem,
  pemToDer,
  readStreamConfig,
  signPlaybackToken,
  thumbnailUrl,
} from "./stream.ts";
import type { StreamConfig } from "./stream.ts";

/**
 * These tests never touch Cloudflare. They generate a real RSA keypair locally,
 * sign with the same code path production uses, and verify the signature with
 * Node's crypto — which is exactly what Cloudflare's edge does. If these pass,
 * the JWT is a well-formed RS256 token with the claims Stream requires.
 */
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const KEY_ID = "aabbccddeeff00112233445566778899";
const VIDEO_UID = "ea95132c15732412d22c1476fa83f27a";

const config: StreamConfig = {
  keyId: KEY_ID,
  privateKeyPem: privateKey,
  deliveryHost: "customer-testcode123.cloudflarestream.com",
  ttlSeconds: DEFAULT_PLAYBACK_TTL_SECONDS,
};

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Verify a token the way Cloudflare would. */
function verify(token: string): boolean {
  const [header, payload, signature] = token.split(".");
  return createVerify("RSA-SHA256")
    .update(`${header}.${payload}`)
    .verify(createPublicKey(publicKey), base64UrlToBuffer(signature!));
}

/* -------------------------------------------------------------------------- */
/* PEM handling                                                               */
/* -------------------------------------------------------------------------- */

test("normalizePrivateKeyPem accepts a literal PEM block", () => {
  assert.equal(normalizePrivateKeyPem(privateKey), privateKey.trim());
});

test("normalizePrivateKeyPem accepts the base64 blob Cloudflare returns", () => {
  // The /stream/keys endpoint returns `pem` base64-encoded.
  const asCloudflareReturnsIt = Buffer.from(privateKey, "utf8").toString("base64");
  assert.equal(normalizePrivateKeyPem(asCloudflareReturnsIt), privateKey.trim());
});

test("normalizePrivateKeyPem repairs shell-escaped newlines", () => {
  const escaped = privateKey.trim().replace(/\n/g, "\\n");
  assert.equal(normalizePrivateKeyPem(escaped), privateKey.trim());
});

test("normalizePrivateKeyPem rejects a PKCS#1 key with an actionable message", () => {
  const pkcs1 = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
  assert.throws(() => normalizePrivateKeyPem(pkcs1), /PKCS#8/);
});

test("normalizePrivateKeyPem rejects junk", () => {
  assert.throws(() => normalizePrivateKeyPem("hello there"), /PEM/);
  assert.throws(() => normalizePrivateKeyPem(""), /PEM/);
});

test("pemToDer strips the armour", () => {
  const der = pemToDer(privateKey);
  assert.ok(der.length > 1000);
  // A PKCS#8 RSA key is a DER SEQUENCE.
  assert.equal(der[0], 0x30);
});

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

test("readStreamConfig reports precisely what is missing", () => {
  assert.deepEqual(readStreamConfig({}), {
    ok: false,
    reason: "CF_STREAM_SIGNING_KEY_ID is not set",
  });
  assert.deepEqual(readStreamConfig({ CF_STREAM_SIGNING_KEY_ID: KEY_ID }), {
    ok: false,
    reason: "CF_STREAM_SIGNING_KEY_PEM is not set",
  });
});

test("readStreamConfig never echoes the key material in an error", () => {
  const result = readStreamConfig({
    CF_STREAM_SIGNING_KEY_ID: KEY_ID,
    CF_STREAM_SIGNING_KEY_PEM: "totally-not-a-key",
  });
  assert.equal(result.ok, false);
  assert.ok(!result.ok && !result.reason.includes("totally-not-a-key"));
});

test("readStreamConfig defaults the host and the TTL", () => {
  const result = readStreamConfig({
    CF_STREAM_SIGNING_KEY_ID: KEY_ID,
    CF_STREAM_SIGNING_KEY_PEM: privateKey,
  });
  assert.ok(result.ok);
  assert.equal(result.config.deliveryHost, DEFAULT_DELIVERY_HOST);
  assert.equal(result.config.ttlSeconds, DEFAULT_PLAYBACK_TTL_SECONDS);
});

test("readStreamConfig clamps a reckless TTL to Cloudflare's 24h maximum", () => {
  const result = readStreamConfig({
    CF_STREAM_SIGNING_KEY_ID: KEY_ID,
    CF_STREAM_SIGNING_KEY_PEM: privateKey,
    CF_STREAM_TOKEN_TTL_SECONDS: "999999",
  });
  assert.ok(result.ok);
  assert.equal(result.config.ttlSeconds, MAX_PLAYBACK_TTL_SECONDS);
});

test("readStreamConfig ignores a nonsense TTL rather than trusting it", () => {
  for (const value of ["0", "-60", "soon", ""]) {
    const result = readStreamConfig({
      CF_STREAM_SIGNING_KEY_ID: KEY_ID,
      CF_STREAM_SIGNING_KEY_PEM: privateKey,
      CF_STREAM_TOKEN_TTL_SECONDS: value,
    });
    assert.ok(result.ok);
    assert.equal(result.config.ttlSeconds, DEFAULT_PLAYBACK_TTL_SECONDS, value);
  }
});

test("readStreamConfig rejects a delivery host that is not a bare hostname", () => {
  const result = readStreamConfig({
    CF_STREAM_SIGNING_KEY_ID: KEY_ID,
    CF_STREAM_SIGNING_KEY_PEM: privateKey,
    CF_STREAM_CUSTOMER_SUBDOMAIN: "https://evil.example.com/path",
  });
  assert.equal(result.ok, false);
});

/* -------------------------------------------------------------------------- */
/* Signing                                                                    */
/* -------------------------------------------------------------------------- */

test("signPlaybackToken produces a verifiable RS256 JWT", async () => {
  const token = await signPlaybackToken({ videoUid: VIDEO_UID, config });

  assert.equal(token.split(".").length, 3);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.ok(verify(token), "signature must verify against the public key");
});

test("the JWT header carries alg RS256 and the key id", async () => {
  const token = await signPlaybackToken({ videoUid: VIDEO_UID, config });
  const { header } = decodeJwt(token);
  assert.deepEqual(header, { alg: "RS256", kid: KEY_ID });
});

test("the JWT claims are the ones Cloudflare Stream requires", async () => {
  const now = 1_800_000_000;
  const token = await signPlaybackToken({ videoUid: VIDEO_UID, config, now });
  const { payload } = decodeJwt(token) as { payload: Record<string, unknown> };

  assert.equal(payload.sub, VIDEO_UID, "sub scopes the token to one video");
  assert.equal(payload.kid, KEY_ID);
  assert.equal(payload.exp, now + DEFAULT_PLAYBACK_TTL_SECONDS);
  assert.equal(payload.nbf, now - 60, "60s of clock-skew tolerance");
  assert.ok(!("downloadable" in payload), "downloads are off unless asked for");
  assert.ok(!("accessRules" in payload));
});

test("token lifetime is short by default and never exceeds 24 hours", async () => {
  const now = 1_800_000_000;
  assert.equal(DEFAULT_PLAYBACK_TTL_SECONDS, 2 * 60 * 60);

  const token = await signPlaybackToken({
    videoUid: VIDEO_UID,
    config,
    now,
    ttlSeconds: 60 * 60 * 24 * 30,
  });
  const { payload } = decodeJwt(token) as { payload: { exp: number } };
  assert.equal(payload.exp, now + MAX_PLAYBACK_TTL_SECONDS);
});

test("a custom TTL is honoured", async () => {
  const now = 1_800_000_000;
  const token = await signPlaybackToken({
    videoUid: VIDEO_UID,
    config,
    now,
    ttlSeconds: 900,
  });
  const { payload } = decodeJwt(token) as { payload: { exp: number } };
  assert.equal(payload.exp, now + 900);
});

test("optional claims are emitted only when requested", async () => {
  const token = await signPlaybackToken({
    videoUid: VIDEO_UID,
    config,
    downloadable: true,
    accessRules: [{ type: "ip.geoip.country", action: "allow", country: ["MD"] }],
  });
  const { payload } = decodeJwt(token) as { payload: Record<string, unknown> };
  assert.equal(payload.downloadable, true);
  assert.deepEqual(payload.accessRules, [
    { type: "ip.geoip.country", action: "allow", country: ["MD"] },
  ]);
  assert.ok(verify(token));
});

test("signPlaybackToken refuses anything that is not a Stream UID", async () => {
  for (const uid of [
    "",
    "abc",
    `${VIDEO_UID}0`,
    "../../secret",
    "ZZ95132c15732412d22c1476fa83f27a",
  ]) {
    await assert.rejects(
      () => signPlaybackToken({ videoUid: uid, config }),
      /Stream UID/,
      uid,
    );
  }
});

test("a tampered payload no longer verifies", async () => {
  const token = await signPlaybackToken({ videoUid: VIDEO_UID, config });
  const [header, , signature] = token.split(".");
  const forged = Buffer.from(
    JSON.stringify({ sub: "ffffffffffffffffffffffffffffffff", kid: KEY_ID, exp: 9e9 }),
  ).toString("base64url");
  assert.equal(verify(`${header}.${forged}.${signature}`), false);
});

test("signing the same video twice does not reuse a signature", async () => {
  const a = await signPlaybackToken({ videoUid: VIDEO_UID, config, now: 1000 });
  const b = await signPlaybackToken({ videoUid: VIDEO_UID, config, now: 2000 });
  assert.notEqual(a, b);
});

/* -------------------------------------------------------------------------- */
/* URLs                                                                       */
/* -------------------------------------------------------------------------- */

test("playback URLs put the signed token where the UID would otherwise go", async () => {
  const token = await signPlaybackToken({ videoUid: VIDEO_UID, config });
  const urls = [
    iframeUrl(config, token),
    thumbnailUrl(config, token, { timeSeconds: 3 }),
    hlsManifestUrl(config, token),
    dashManifestUrl(config, token),
  ];

  for (const url of urls) {
    assert.ok(url.startsWith(`https://${config.deliveryHost}/${token}/`), url);
    assert.ok(!url.includes(VIDEO_UID), "the video UID must never appear in a URL");
    assert.ok(!url.includes(config.privateKeyPem.slice(30, 60)));
  }

  assert.match(iframeUrl(config, token), /\/iframe\?/);
  assert.match(iframeUrl(config, token, { autoplay: true }), /autoplay=true/);
  assert.match(thumbnailUrl(config, token, { timeSeconds: 3 }), /time=3s/);
  assert.match(hlsManifestUrl(config, token), /\/manifest\/video\.m3u8$/);
  assert.match(dashManifestUrl(config, token), /\/manifest\/video\.mpd$/);
});
