import assert from "node:assert/strict";
import test from "node:test";
import { cfVisitorPattern, forwardedProtoPattern, requestScheme } from "./https.ts";

/**
 * Both regex compilers this codebase's `has` rules pass through, reproduced
 * from their sources.
 *
 * The point of testing against two copies of somebody else's code is that the
 * difference between them is not academic: it took the live site down on
 * 2026-09-01. If either upstream changes its wrapping, these fixtures stop
 * matching reality — but the patterns are anchored precisely so that they are
 * correct under *any* wrapping, which is the property being asserted.
 */
const matchers = {
  // next/dist/shared/lib/router/utils/prepare-destination.js — `next dev`, `next start`
  next: (pattern: string, value: string) => new RegExp(`^${pattern}$`).test(value),
  // @opennextjs/aws/dist/core/routing/matcher.js — Cloudflare
  openNext: (pattern: string, value: string) => new RegExp(pattern).test(value),
} as const;

test("the http pattern never matches https, under either matcher", () => {
  for (const [name, matches] of Object.entries(matchers)) {
    assert.equal(
      matches(forwardedProtoPattern("http"), "http"),
      true,
      `${name}: should match http`,
    );
    assert.equal(
      matches(forwardedProtoPattern("http"), "https"),
      false,
      `${name}: must NOT match https — this is the redirect loop`,
    );
    assert.equal(
      matches(forwardedProtoPattern("https"), "https"),
      true,
      `${name}: should match https`,
    );
    assert.equal(
      matches(forwardedProtoPattern("https"), "http"),
      false,
      `${name}: should not match http`,
    );
  }
});

test("the cf-visitor pattern distinguishes the two schemes", () => {
  for (const [name, matches] of Object.entries(matchers)) {
    assert.equal(matches(cfVisitorPattern("http"), '{"scheme":"http"}'), true, name);
    assert.equal(
      matches(cfVisitorPattern("http"), '{"scheme":"https"}'),
      false,
      `${name}: must NOT match https`,
    );
    assert.equal(matches(cfVisitorPattern("https"), '{"scheme":"https"}'), true, name);
  }
});

test("requestScheme prefers x-forwarded-proto", () => {
  assert.equal(requestScheme(new Headers({ "x-forwarded-proto": "https" })), "https");
  assert.equal(requestScheme(new Headers({ "x-forwarded-proto": "http" })), "http");
});

test("requestScheme falls back to cf-visitor only when x-forwarded-proto is absent", () => {
  assert.equal(
    requestScheme(new Headers({ "cf-visitor": '{"scheme":"http"}' })),
    "http",
  );
  assert.equal(
    requestScheme(new Headers({ "cf-visitor": '{"scheme":"https"}' })),
    "https",
  );
  // Present but unrecognised: the fallback must not paper over it.
  assert.equal(
    requestScheme(
      new Headers({
        "x-forwarded-proto": "gopher",
        "cf-visitor": '{"scheme":"http"}',
      }),
    ),
    null,
  );
});

test("requestScheme says nothing when nothing says anything", () => {
  // This is `pnpm dev` and `pnpm preview`. It has to stay null, or local HTTP
  // starts redirecting to an https://localhost that does not exist.
  assert.equal(requestScheme(new Headers()), null);
  assert.equal(requestScheme(new Headers({ "cf-visitor": "not json" })), null);
  assert.equal(requestScheme(new Headers({ "cf-visitor": "{}" })), null);
});
