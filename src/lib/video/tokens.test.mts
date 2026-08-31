import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_TOKEN_LENGTH,
  generateToken,
  isWellFormedToken,
  timingSafeEqual,
  timingSafeIndexOf,
} from "./tokens.ts";

test("generateToken produces URL-safe tokens above the entropy floor", () => {
  const token = generateToken();
  // 24 bytes -> 32 base64url characters -> 192 bits.
  assert.equal(token.length, 32);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= MIN_TOKEN_LENGTH);
  assert.ok(!token.includes("="), "no base64 padding");
});

test("generateToken does not repeat", () => {
  const seen = new Set(Array.from({ length: 500 }, () => generateToken()));
  assert.equal(seen.size, 500);
});

test("generateToken refuses to make a weak token", () => {
  assert.throws(() => generateToken(8), /at least 16 bytes/);
});

test("isWellFormedToken enforces alphabet and length", () => {
  assert.ok(isWellFormedToken(generateToken()));
  assert.ok(isWellFormedToken("a".repeat(MIN_TOKEN_LENGTH)));

  assert.ok(!isWellFormedToken("a".repeat(MIN_TOKEN_LENGTH - 1)), "too short");
  assert.ok(!isWellFormedToken("a".repeat(129)), "too long");
  assert.ok(!isWellFormedToken("has spaces in it aaaaaaaaaa"), "space");
  assert.ok(!isWellFormedToken("../../../etc/passwd/aaaaaaaa"), "path traversal");
  assert.ok(!isWellFormedToken("token+with/base64+chars=="), "non-URL-safe base64");
  assert.ok(!isWellFormedToken(""), "empty");
  assert.ok(!isWellFormedToken(undefined), "undefined");
  assert.ok(!isWellFormedToken(12345), "number");
});

test("timingSafeEqual matches only identical strings", async () => {
  const token = generateToken();
  assert.equal(await timingSafeEqual(token, token), true);
  assert.equal(await timingSafeEqual(token, `${token}x`), false);
  assert.equal(await timingSafeEqual(token, token.slice(0, -1)), false);
  assert.equal(await timingSafeEqual("", ""), true);
  assert.equal(await timingSafeEqual("a", "b"), false);
});

test("timingSafeIndexOf finds the entry it should", async () => {
  const tokens = Array.from({ length: 5 }, () => generateToken());
  assert.equal(await timingSafeIndexOf(tokens[3]!, tokens), 3);
  assert.equal(await timingSafeIndexOf(tokens[0]!, tokens), 0);
  assert.equal(await timingSafeIndexOf(generateToken(), tokens), -1);
  assert.equal(await timingSafeIndexOf("anything", []), -1);
});

test("timingSafeIndexOf returns the first of duplicate tokens", async () => {
  const token = generateToken();
  const other = generateToken();
  assert.equal(await timingSafeIndexOf(token, [other, token, token]), 1);
});

test("a near-miss on a long shared prefix still fails", async () => {
  // The property that matters: comparison is over an HMAC, so sharing 31 of 32
  // characters gets an attacker exactly as far as sharing none.
  const token = generateToken();
  const nearMiss = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.notEqual(token, nearMiss);
  assert.equal(await timingSafeIndexOf(nearMiss, [token]), -1);
});
