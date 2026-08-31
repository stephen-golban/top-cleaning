import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  createSessionToken,
  validateAccessSecret,
  verifySessionToken,
} from "../lib/private-video/crypto";
import { parseSingleByteRange } from "../lib/private-video/range";

const KEY = "11".repeat(32);

describe("private-video crypto", () => {
  it("compares equal and unequal byte arrays", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 0]))).toBe(false);
  });

  it("validates only the token matching the configured SHA-256", async () => {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("correct-secret")));
    const hex = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(validateAccessSecret("correct-secret", hex)).resolves.toBe(true);
    await expect(validateAccessSecret("wrong-secret", hex)).resolves.toBe(false);
  });

  it("accepts a signed live session and rejects tampering or expiry", async () => {
    const token = await createSessionToken(KEY, 300, 1_000, new Uint8Array(16).fill(7));
    await expect(verifySessionToken(token, KEY, 1_100)).resolves.toBe(true);
    await expect(verifySessionToken(`${token.slice(0, -1)}A`, KEY, 1_100)).resolves.toBe(false);
    await expect(verifySessionToken(token, KEY, 1_301)).resolves.toBe(false);
  });
});
describe("single byte ranges", () => {
  it.each([
    [null, { kind: "full" }],
    ["bytes=0-9", { kind: "partial", start: 0, end: 9, length: 10 }],
    ["bytes=90-", { kind: "partial", start: 90, end: 99, length: 10 }],
    ["bytes=-10", { kind: "partial", start: 90, end: 99, length: 10 }],
    ["bytes=95-200", { kind: "partial", start: 95, end: 99, length: 5 }],
    ["bytes=100-", { kind: "unsatisfiable" }],
    ["bytes=9-2", { kind: "unsatisfiable" }],
    ["bytes=0-1,4-5", { kind: "unsatisfiable" }],
    ["items=0-1", { kind: "unsatisfiable" }],
  ])("parses %s", (header, expected) => {
    expect(parseSingleByteRange(header, 100)).toEqual(expected);
  });
});
