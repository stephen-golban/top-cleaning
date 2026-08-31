import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { buildSignedPlayback } from "./playback.ts";
import type { VideoLink } from "./types.ts";

/**
 * `buildSignedPlayback` is the boundary between server secrets and the browser.
 * These tests assert what is allowed to cross it.
 */
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const KEY_ID = "aabbccddeeff00112233445566778899";
const UID_A = "ea95132c15732412d22c1476fa83f27a";
const UID_B = "1b2c3d4e5f60718293a4b5c6d7e8f900";

const env = {
  CF_STREAM_SIGNING_KEY_ID: KEY_ID,
  CF_STREAM_SIGNING_KEY_PEM: privateKey,
  CF_STREAM_CUSTOMER_SUBDOMAIN: "customer-testcode123.cloudflarestream.com",
  CF_ACCOUNT_ID: "b8348ba8b3e65b3b3dd2ad6324a280f6",
  CF_STREAM_API_TOKEN: "super-secret-api-token",
};

const link: VideoLink = {
  token: "Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S",
  title: { ro: "Titlu RO", ru: "Заголовок RU", en: "Title EN" },
  description: { ro: "Descriere RO" },
  clips: [
    { uid: UID_A, title: { ro: "Primul", en: "First" }, posterTime: 4 },
    { uid: UID_B },
  ],
};

test("every clip gets a signed player URL and a signed poster URL", async () => {
  const result = await buildSignedPlayback(link, "ro", env);
  assert.ok(result);
  assert.equal(result.clips.length, 2);

  for (const clip of result.clips) {
    assert.match(
      clip.iframeSrc,
      /^https:\/\/customer-testcode123\.cloudflarestream\.com\//,
    );
    assert.match(clip.iframeSrc, /\/iframe\?/);
    assert.match(clip.posterSrc, /\/thumbnails\/thumbnail\.jpg\?/);
  }
  assert.match(result.clips[0]!.posterSrc, /time=4s/, "posterTime is honoured");
  assert.match(result.clips[1]!.posterSrc, /time=1s/, "posterTime defaults to 1s");
});

test("nothing secret crosses the server/client boundary", async () => {
  const result = await buildSignedPlayback(link, "ro", env);
  assert.ok(result);

  const serialised = JSON.stringify(result);
  for (const secret of [
    UID_A,
    UID_B,
    link.token,
    env.CF_ACCOUNT_ID,
    env.CF_STREAM_API_TOKEN,
    privateKey.slice(40, 120),
  ]) {
    assert.ok(!serialised.includes(secret), `leaked: ${secret.slice(0, 16)}…`);
  }
});

test("signed URLs carry an expiry the caller can see", async () => {
  const before = Math.floor(Date.now() / 1000);
  const result = await buildSignedPlayback(link, "ro", env);
  assert.ok(result);
  assert.ok(result.expiresAt >= before + 7200);
  assert.ok(result.expiresAt <= before + 7205);
});

test("copy is resolved for the requested locale", async () => {
  const ro = await buildSignedPlayback(link, "ro", env);
  const en = await buildSignedPlayback(link, "en", env);
  assert.equal(ro?.title, "Titlu RO");
  assert.equal(en?.title, "Title EN");
  assert.equal(ro?.clips[0]?.title, "Primul");
  assert.equal(en?.clips[0]?.title, "First");
});

test("a missing translation falls back instead of rendering blank", async () => {
  const ru = await buildSignedPlayback(link, "ru", env);
  // `description` only exists in RO; RU falls back to it rather than to nothing.
  assert.equal(ru?.description, "Descriere RO");
  assert.equal(ru?.title, "Заголовок RU");
});

test("a clip with no title of its own reports none, for the page to fill in", async () => {
  const result = await buildSignedPlayback(link, "ro", env);
  assert.equal(result?.clips[1]?.title, undefined);
});

test("an unconfigured or broken signing key fails closed", async () => {
  assert.equal(await buildSignedPlayback(link, "ro", {}), null);
  assert.equal(
    await buildSignedPlayback(link, "ro", {
      CF_STREAM_SIGNING_KEY_ID: KEY_ID,
      CF_STREAM_SIGNING_KEY_PEM: "not a key",
    }),
    null,
  );
});

test("React keys are positional, never the video UID", async () => {
  const result = await buildSignedPlayback(link, "ro", env);
  assert.deepEqual(
    result?.clips.map((clip) => clip.key),
    ["clip-0", "clip-1"],
  );
});
