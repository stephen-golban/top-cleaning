import "./node-test-setup.mts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { publicRoutes } = await import("./routes.ts");

/**
 * Keeps the legacy 301/308 map in `next.config.ts` honest.
 *
 * The old topcleaning.md paths are historical constants — nothing else in the
 * codebase knows them, so they are written out literally in the config. Their
 * *destinations*, though, are live routes derived from
 * `src/i18n/routing.ts` and `src/content/services.ts`. Rename a service slug
 * and every one of those redirects silently starts pointing at a 404, which is
 * strictly worse than not redirecting at all.
 *
 * So this test reads the shipped config and checks each destination against the
 * real route table. It parses the file as text on purpose: `next.config.ts`
 * cannot be imported here (it pulls in the next-intl plugin), and the point is
 * to verify the bytes that ship, not a copy of them.
 */

const configPath = new URL("../../../next.config.ts", import.meta.url);
const config = readFileSync(configPath, "utf8");

/**
 * Just the `legacyRedirects` array. Scoped deliberately: the same file's
 * `headers()` block also uses `source:`, and it is the video feature's — the
 * `/v/` rules there must stay exactly where they are.
 */
const redirectTable = (() => {
  const start = config.indexOf("const legacyRedirects = [");
  assert.notEqual(start, -1, "next.config.ts no longer declares `legacyRedirects`");
  const end = config.indexOf("] as const;", start);
  assert.notEqual(end, -1, "the `legacyRedirects` array is not terminated as expected");
  return config.slice(start, end);
})();

function fieldValues(field: "source" | "destination"): string[] {
  return [...redirectTable.matchAll(new RegExp(`${field}:\\s*"([^"]+)"`, "g"))].map(
    (match) => match[1]!,
  );
}

/** Every public path the site actually serves, across all locales. */
const livePaths = new Set(publicRoutes.flatMap((route) => Object.values(route.paths)));

test("the config still declares a legacy redirect table", () => {
  assert.ok(
    config.includes("async redirects()"),
    "next.config.ts lost its redirects()",
  );
  assert.ok(
    fieldValues("destination").length >= 13,
    "the legacy redirect table shrank unexpectedly",
  );
});

test("every redirect destination is a route the site serves today", () => {
  for (const destination of fieldValues("destination")) {
    assert.ok(
      livePaths.has(destination),
      `${destination} is not a live route — check src/content/services.ts slugs ` +
        `and src/i18n/routing.ts pathnames`,
    );
  }
});

test("no redirect points at itself", () => {
  const sources = fieldValues("source");
  const destinations = fieldValues("destination");
  assert.equal(sources.length, destinations.length);

  for (const [index, source] of sources.entries()) {
    assert.notEqual(
      source,
      destinations[index],
      `${source} redirects to itself — that is an infinite loop`,
    );
  }
});

test("no redirect source is a path the site still serves", () => {
  for (const source of fieldValues("source")) {
    assert.ok(
      !livePaths.has(source),
      `${source} is both a legacy redirect source and a live route`,
    );
  }
});

test("no redirect touches the private video route", () => {
  for (const value of [...fieldValues("source"), ...fieldValues("destination")]) {
    assert.ok(!value.includes("/v/"), `${value} references the private video route`);
  }
});

test("each service has a legacy redirect in both original locales", () => {
  const destinations = new Set(fieldValues("destination"));

  for (const route of publicRoutes) {
    if (!route.id.startsWith("service:")) continue;
    // The old site had no English locale, so only RO and RU are expected.
    assert.ok(
      destinations.has(route.paths.ro),
      `no RO legacy redirect for ${route.id}`,
    );
    assert.ok(
      destinations.has(route.paths.ru),
      `no RU legacy redirect for ${route.id}`,
    );
  }
});
