import assert from "node:assert/strict";
import test from "node:test";
import {
  createVerify,
  generateKeyPairSync,
  type KeyObject,
  createPrivateKey,
} from "node:crypto";

import { toPkcs8Pem } from "./stream.mjs";
import { normalizePrivateKeyPem } from "../src/lib/stream.ts";

/**
 * The PKCS#1 → PKCS#8 conversion in `scripts/stream.mjs`.
 *
 * Cloudflare hands back `BEGIN RSA PRIVATE KEY` (PKCS#1). The Workers runtime
 * has only `crypto.subtle.importKey`, which takes PKCS#8 and nothing else. When
 * that conversion is wrong the site fails *closed and silently*: every `/v/`
 * link 404s exactly as an unknown token does, and the real reason shows up only
 * in `wrangler tail`. That is what happened on 2026-09-02.
 *
 * So these tests do not assert on the shape of the PEM string. They generate a
 * real key, push it through the conversion, and then make the Web Crypto call
 * the Worker makes — and, for the round trip that matters, verify a signature
 * made by the converted key against the *original* public half. That is the
 * only assertion that proves the conversion preserved the key rather than
 * merely producing something PKCS#8-shaped.
 */

/** A 2048-bit RSA key in the shape Cloudflare returns it: PKCS#1 PEM. */
function generatePkcs1(): { pkcs1: string; publicKey: KeyObject } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    pkcs1: privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    publicKey,
  };
}

/** Strip the armour, exactly as `pemToDer` does in `src/lib/stream.ts`. */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  // Node types every `Buffer` as backed by `ArrayBufferLike` (i.e. possibly a
  // `SharedArrayBuffer`, which `BufferSource` rejects); `Buffer.from(string)`
  // never is. Same return type as the real `pemToDer` in `src/lib/stream.ts`.
  return Buffer.from(body, "base64") as Uint8Array<ArrayBuffer>;
}

/** The import the Worker performs on every request to a `/v/` page. */
function importAsWorker(pkcs8: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pkcs8),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

test("a PKCS#1 key converts into a PKCS#8 key Web Crypto will import", async () => {
  const { pkcs1 } = generatePkcs1();
  assert.match(pkcs1, /BEGIN RSA PRIVATE KEY/, "precondition: input is PKCS#1");

  const pkcs8 = toPkcs8Pem(pkcs1);

  assert.match(pkcs8, /^-----BEGIN PRIVATE KEY-----/);
  assert.match(pkcs8, /-----END PRIVATE KEY-----$/);
  assert.ok(
    !pkcs8.includes("BEGIN RSA PRIVATE KEY"),
    "PKCS#1 armour must not survive the conversion",
  );

  // The assertion that counts: the runtime accepts it.
  const key = await importAsWorker(pkcs8);
  assert.equal(key.type, "private");
  assert.equal(key.algorithm.name, "RSASSA-PKCS1-v1_5");
});

test("the converted key is the same key — it signs verifiably", async () => {
  const { pkcs1, publicKey } = generatePkcs1();
  const key = await importAsWorker(toPkcs8Pem(pkcs1));

  const message = new TextEncoder().encode("eyJhbGciOiJSUzI1NiJ9.payload");
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, message);

  // Verified against the ORIGINAL public half, so a conversion that quietly
  // produced a different (but well-formed) key would fail here.
  const verified = createVerify("RSA-SHA256")
    .update(Buffer.from(message))
    .verify(publicKey, Buffer.from(signature));
  assert.ok(verified, "signature from the converted key must verify");
});

test("Cloudflare's base64-wrapped PEM is accepted", async () => {
  // `.dev.vars` cannot hold newlines, so `createKey` stores the PEM base64-wrapped
  // — the same shape Cloudflare's API uses. It has to survive a second trip.
  const { pkcs1, publicKey } = generatePkcs1();
  const wrapped = Buffer.from(pkcs1, "utf8").toString("base64");

  const pkcs8 = toPkcs8Pem(wrapped);
  assert.match(pkcs8, /BEGIN PRIVATE KEY/);

  const key = await importAsWorker(pkcs8);
  const message = new TextEncoder().encode("round trip");
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, message);
  assert.ok(
    createVerify("RSA-SHA256")
      .update(Buffer.from(message))
      .verify(publicKey, Buffer.from(signature)),
  );
});

test("a PEM with escaped newlines is accepted", async () => {
  // How a PEM arrives when it has been pasted through a JSON field or a shell
  // variable: literal backslash-n instead of real line breaks.
  const { pkcs1 } = generatePkcs1();
  const escaped = pkcs1.replace(/\n/g, "\\n");
  assert.ok(!escaped.includes("\n"), "precondition: no real newlines");

  const pkcs8 = toPkcs8Pem(escaped);
  await importAsWorker(pkcs8);
  assert.match(pkcs8, /BEGIN PRIVATE KEY/);
});

test("a key that is already PKCS#8 passes through unchanged", async () => {
  const { pkcs1 } = generatePkcs1();
  const pkcs8 = toPkcs8Pem(pkcs1);

  // Idempotent: re-running `pnpm video:stream keys` on a converted key, or
  // feeding it a key Cloudflare already returned as PKCS#8, must not corrupt it.
  assert.equal(toPkcs8Pem(pkcs8), pkcs8);
  await importAsWorker(toPkcs8Pem(pkcs8));
});

test("surrounding whitespace does not defeat the conversion", async () => {
  const { pkcs1 } = generatePkcs1();
  const pkcs8 = toPkcs8Pem(`\n\n  ${pkcs1}  \n\n`);
  await importAsWorker(pkcs8);
});

test("the CLI's output is what the Worker's own gate accepts", async () => {
  // Closes the loop between the two halves: `normalizePrivateKeyPem` in
  // `src/lib/stream.ts` is the runtime gate, and it rejects PKCS#1 outright.
  // What `toPkcs8Pem` writes must get past it, in both stored shapes.
  const { pkcs1 } = generatePkcs1();
  const pkcs8 = toPkcs8Pem(pkcs1);

  assert.equal(normalizePrivateKeyPem(pkcs8), pkcs8);
  assert.equal(
    normalizePrivateKeyPem(Buffer.from(pkcs8, "utf8").toString("base64")),
    pkcs8,
  );

  // And the unconverted key is exactly what that gate is there to catch.
  assert.throws(() => normalizePrivateKeyPem(pkcs1), /PKCS#1/);
});

test("a non-key input is rejected rather than silently mangled", () => {
  // `createPrivateKey` is what does the parsing; garbage must not come back as
  // a plausible-looking PEM.
  assert.throws(() => createPrivateKey("-----BEGIN RSA PRIVATE KEY-----\nnope\n"));
});
