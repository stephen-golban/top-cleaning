import "./node-test-setup.mts";
import assert from "node:assert/strict";
import test from "node:test";
import { assertNoPrivateRoutes, isPrivatePath } from "./private-routes.ts";

const { buildSitemap } = await import("./sitemap.ts");
const { publicRoutes } = await import("./routes.ts");
const { locales } = await import("../../i18n/routing.ts");

/**
 * The constraint under test, from `.agents/FOLLOWUPS.md`:
 *
 *   sitemap.ts MUST NOT emit any `/v/` path. There is no automatic guard. The
 *   private video route is excluded by convention only — breaking this
 *   publishes the client's private videos to search engines.
 *
 * This file is that automatic guard's test. It checks the detector, the
 * assertion built on it, and the actual bytes the sitemap would publish.
 */

test("isPrivatePath flags every shape the private video route takes", () => {
  for (const path of [
    "/v/abc123",
    "/ro/v/abc123",
    "/ru/v/abc123",
    "/en/v/abc123",
    "https://topcleaning.md/v/abc123",
    "https://topcleaning.md/ro/v/abc123",
    "/v/abc123?utm_source=qr",
    "/v/abc123#t=10",
    "/v/",
  ]) {
    assert.equal(isPrivatePath(path), true, `expected ${path} to be private`);
  }
});

test("isPrivatePath leaves genuine public paths alone", () => {
  for (const path of [
    "/",
    "/ro",
    "/ro/servicii",
    "/ro/servicii/curatenie-generala",
    "/ru/uslugi/generalnaya-uborka",
    "/en/services/upholstery-cleaning",
    "/ro/despre-noi",
    "/en/contact",
    "https://topcleaning.md/ro/servicii",
    // A token-looking segment that merely starts with "v" is not a `/v/` route.
    "/ro/servicii/ventilatie",
  ]) {
    assert.equal(isPrivatePath(path), false, `expected ${path} to be public`);
  }
});

test("assertNoPrivateRoutes throws when a private URL is in the list", () => {
  assert.throws(
    () =>
      assertNoPrivateRoutes(
        [
          { url: "https://topcleaning.md/ro/servicii" },
          { url: "https://topcleaning.md/v/tok" },
        ],
        "test",
      ),
    /private URL/,
  );
});

test("assertNoPrivateRoutes also inspects hreflang alternates", () => {
  assert.throws(
    () =>
      assertNoPrivateRoutes(
        [
          {
            url: "https://topcleaning.md/ro/servicii",
            alternates: {
              languages: {
                "ro-MD": "https://topcleaning.md/ro/servicii",
                "ru-MD": "https://topcleaning.md/ru/v/tok",
              },
            },
          },
        ],
        "test",
      ),
    /private URL/,
  );
});

test("assertNoPrivateRoutes passes clean entries through unchanged", () => {
  const entries = [{ url: "https://topcleaning.md/ro/servicii" }];
  assert.equal(assertNoPrivateRoutes(entries, "test"), entries);
});

test("the real sitemap emits no private path, in any URL or alternate", () => {
  const entries = buildSitemap();

  for (const entry of entries) {
    assert.equal(isPrivatePath(entry.url), false, `sitemap leaked ${entry.url}`);
    assert.ok(!entry.url.includes("/v/"), `sitemap leaked ${entry.url}`);
    for (const alternate of Object.values(entry.alternates.languages)) {
      assert.equal(isPrivatePath(alternate), false, `alternate leaked ${alternate}`);
      assert.ok(!alternate.includes("/v/"), `alternate leaked ${alternate}`);
    }
  }
});

test("the public route table excludes the private video route", () => {
  for (const route of publicRoutes) {
    assert.notEqual(route.pathname, "/v/[token]");
    for (const path of Object.values(route.paths)) {
      assert.equal(isPrivatePath(path), false, `route table leaked ${path}`);
    }
  }
});

test("the sitemap covers every public route in every locale, with no duplicates", () => {
  const entries = buildSitemap();

  assert.equal(entries.length, publicRoutes.length * locales.length);

  const urls = entries.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length, "sitemap contains duplicate URLs");
});

test("every sitemap entry carries all three locales plus x-default → ro", () => {
  for (const entry of buildSitemap()) {
    const languages = entry.alternates.languages;
    assert.deepEqual(Object.keys(languages).sort(), [
      "en",
      "ro-MD",
      "ru-MD",
      "x-default",
    ]);
    assert.equal(languages["x-default"], languages["ro-MD"]);
  }
});

test("sitemap URLs are absolute and locale-prefixed", () => {
  for (const entry of buildSitemap()) {
    const url = new URL(entry.url);
    const [first] = url.pathname.split("/").filter(Boolean);
    assert.ok(
      locales.includes(first as (typeof locales)[number]),
      `${entry.url} does not start with a locale segment`,
    );
  }
});
