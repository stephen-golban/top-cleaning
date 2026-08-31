import assert from "node:assert/strict";
import test from "node:test";
import {
  loadVideoCatalog,
  mergeVideoLinks,
  parseVideoLinks,
  resetVideoCatalogCache,
  resolveVideoLink,
} from "./catalog.ts";
import { generateToken } from "./tokens.ts";
import type { VideoLink } from "./types.ts";

const UID = "ea95132c15732412d22c1476fa83f27a";

function link(overrides: Partial<VideoLink> = {}): VideoLink {
  return { token: generateToken(), clips: [{ uid: UID }], ...overrides };
}

test("parseVideoLinks accepts a well-formed entry", () => {
  const input = link({
    title: { ro: "Titlu", ru: "Заголовок", en: "Title" },
    description: { en: "About this" },
  });
  const { links, warnings } = parseVideoLinks([input]);
  assert.deepEqual(warnings, []);
  assert.equal(links.length, 1);
  assert.equal(links[0]!.token, input.token);
  assert.equal(links[0]!.clips[0]!.uid, UID);
});

test("parseVideoLinks lowercases the Stream UID", () => {
  const { links } = parseVideoLinks([link({ clips: [{ uid: UID.toUpperCase() }] })]);
  assert.equal(links[0]!.clips[0]!.uid, UID);
});

test("parseVideoLinks rejects weak or malformed tokens", () => {
  const cases: Array<[string, unknown]> = [
    ["short token", { token: "abc", clips: [{ uid: UID }] }],
    ["missing token", { clips: [{ uid: UID }] }],
    ["token with a slash", { token: `${"a".repeat(30)}/x`, clips: [{ uid: UID }] }],
    ["numeric token", { token: 123456789012345678901234, clips: [{ uid: UID }] }],
  ];
  for (const [name, value] of cases) {
    const { links, warnings } = parseVideoLinks([value]);
    assert.equal(links.length, 0, name);
    assert.equal(warnings.length, 1, name);
    assert.match(warnings[0]!.problem, /token/, name);
  }
});

test("parseVideoLinks rejects bad clips", () => {
  const cases: unknown[] = [
    { token: generateToken(), clips: [] },
    { token: generateToken() },
    { token: generateToken(), clips: [{ uid: "not-a-uid" }] },
    { token: generateToken(), clips: [{ uid: `${UID}extra` }] },
    { token: generateToken(), clips: [{ uid: UID, posterTime: -5 }] },
    { token: generateToken(), clips: [{ uid: UID, posterTime: "3s" }] },
    { token: generateToken(), clips: "nope" },
  ];
  for (const value of cases) {
    const { links, warnings } = parseVideoLinks([value]);
    assert.equal(links.length, 0, JSON.stringify(value));
    assert.equal(warnings.length, 1);
  }
});

test("parseVideoLinks rejects unknown locales and non-string copy", () => {
  const bad = [
    { token: generateToken(), clips: [{ uid: UID }], title: { de: "Nein" } },
    { token: generateToken(), clips: [{ uid: UID }], title: { ro: 42 } },
    { token: generateToken(), clips: [{ uid: UID }], description: ["a"] },
  ];
  for (const value of bad) {
    assert.equal(parseVideoLinks([value]).links.length, 0);
  }
});

test("parseVideoLinks keeps the good entries alongside the bad", () => {
  const good = link();
  const { links, warnings } = parseVideoLinks([{ token: "oops" }, good, null]);
  assert.equal(links.length, 1);
  assert.equal(links[0]!.token, good.token);
  assert.deepEqual(
    warnings.map((w) => w.index),
    [0, 2],
  );
});

test("parseVideoLinks warnings never contain the token", () => {
  const secret = `${generateToken()}!`; // invalid because of the "!"
  const { warnings } = parseVideoLinks([{ token: secret, clips: [{ uid: UID }] }]);
  assert.equal(warnings.length, 1);
  assert.ok(!warnings[0]!.problem.includes(secret.slice(0, 10)));
});

test("parseVideoLinks refuses anything that is not an array", () => {
  for (const value of [null, undefined, {}, "[]", 7]) {
    const { links, warnings } = parseVideoLinks(value);
    assert.equal(links.length, 0);
    assert.equal(warnings[0]!.problem, "not a JSON array");
  }
});

test("mergeVideoLinks lets a later source override the same token", () => {
  const token = generateToken();
  const fromFile: VideoLink = { token, clips: [{ uid: UID }], title: { en: "old" } };
  const fromEnv: VideoLink = { token, clips: [{ uid: UID }], title: { en: "new" } };
  const merged = mergeVideoLinks([fromFile], [fromEnv]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.title?.en, "new");
});

test("resolveVideoLink finds a known token", async () => {
  const links = [link(), link(), link()];
  const found = await resolveVideoLink(links[1]!.token, links);
  assert.equal(found?.token, links[1]!.token);
});

test("resolveVideoLink returns null for unknown, malformed and empty input", async () => {
  const links = [link()];
  assert.equal(await resolveVideoLink(generateToken(), links), null);
  assert.equal(await resolveVideoLink("", links), null);
  assert.equal(await resolveVideoLink("short", links), null);
  assert.equal(await resolveVideoLink("../../etc/passwd", links), null);
  assert.equal(await resolveVideoLink(links[0]!.token, []), null);
});

test("resolveVideoLink is case-sensitive", async () => {
  const only = link({ token: "AaBbCcDdEeFfGgHhIiJjKk" });
  assert.equal(await resolveVideoLink("aabbccddeeffgghhiijjkk", [only]), null);
  assert.equal((await resolveVideoLink(only.token, [only]))?.token, only.token);
});

test("loadVideoCatalog picks up PRIVATE_VIDEO_LINKS", () => {
  resetVideoCatalogCache();
  const token = generateToken();
  const catalog = loadVideoCatalog({
    PRIVATE_VIDEO_LINKS: JSON.stringify([{ token, clips: [{ uid: UID }] }]),
  });
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0]!.token, token);
  resetVideoCatalogCache();
});

test("loadVideoCatalog survives invalid JSON in the environment", () => {
  resetVideoCatalogCache();
  const catalog = loadVideoCatalog({ PRIVATE_VIDEO_LINKS: "{not json" });
  assert.deepEqual(catalog, []);
  resetVideoCatalogCache();
});

test("the checked-in links file contains no live entries and no weak tokens", () => {
  resetVideoCatalogCache();
  const catalog = loadVideoCatalog({});
  for (const entry of catalog) {
    assert.ok(entry.token.length >= 22, "shipped token is too short");
    assert.ok(entry.clips.length > 0);
  }
  resetVideoCatalogCache();
});
