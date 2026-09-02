import assert from "node:assert/strict";
import test from "node:test";
import {
  loadVideoCatalog,
  mergeVideoLinks,
  parseVideoLinks,
  resetVideoCatalogCache,
  resolveVideoLink,
  videoLinkKey,
} from "./catalog.ts";
import { videoLinks as shippedLinks } from "./links.ts";
import { generateToken, hashToken } from "./tokens.ts";
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

test("mergeVideoLinks lets a later source override the same token", async () => {
  const token = generateToken();
  const fromFile: VideoLink = { token, clips: [{ uid: UID }], title: { en: "old" } };
  const fromEnv: VideoLink = { token, clips: [{ uid: UID }], title: { en: "new" } };
  const merged = await mergeVideoLinks([fromFile], [fromEnv]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.title?.en, "new");
});

test("mergeVideoLinks matches a hashed entry against a plaintext one", async () => {
  const token = generateToken();
  const hashed: VideoLink = {
    tokenHash: await hashToken(token),
    clips: [{ uid: UID }],
    title: { en: "from links.ts" },
  };
  const plain: VideoLink = { token, clips: [{ uid: UID }], title: { en: "from env" } };
  const merged = await mergeVideoLinks([hashed], [plain]);
  assert.equal(merged.length, 1, "the two forms are the same link");
  assert.equal(merged[0]!.title?.en, "from env");
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

test("loadVideoCatalog picks up PRIVATE_VIDEO_LINKS", async () => {
  // Stated as "one entry more than the file ships" rather than "exactly one",
  // so that registering a real link in `links.ts` does not fail this test.
  resetVideoCatalogCache();
  const token = generateToken();
  const catalog = await loadVideoCatalog({
    PRIVATE_VIDEO_LINKS: JSON.stringify([{ token, clips: [{ uid: UID }] }]),
  });
  assert.equal(catalog.length, shippedLinks.length + 1);
  assert.ok(
    catalog.some((entry) => entry.token === token),
    "the environment entry is in the catalog",
  );
  resetVideoCatalogCache();
});

test("loadVideoCatalog resolves a hashed entry from the environment", async () => {
  resetVideoCatalogCache();
  const token = generateToken();
  const catalog = await loadVideoCatalog({
    PRIVATE_VIDEO_LINKS: JSON.stringify([
      { tokenHash: await hashToken(token), clips: [{ uid: UID }] },
    ]),
  });
  const found = await resolveVideoLink(token, catalog);
  assert.equal(found?.clips[0]?.uid, UID);
  assert.equal(found?.token, undefined, "the plaintext token is never stored");
  resetVideoCatalogCache();
});

test("loadVideoCatalog survives invalid JSON in the environment", async () => {
  resetVideoCatalogCache();
  const baseline = await loadVideoCatalog({});
  resetVideoCatalogCache();
  const catalog = await loadVideoCatalog({ PRIVATE_VIDEO_LINKS: "{not json" });
  // Unparseable JSON is ignored, leaving exactly what `links.ts` ships — not a
  // crash, and not an empty catalog that would take the real links down too.
  assert.deepEqual(catalog, baseline);
  resetVideoCatalogCache();
});

test("the checked-in links file never carries a plaintext token", () => {
  // The guard that keeps the secret out of a public repository. `links.ts` is
  // on GitHub; a token there is a published password, and publishing it also
  // defeats the signed-URL layer, because the site signs playback for whoever
  // presents a token it recognises.
  for (const entry of shippedLinks) {
    assert.equal(
      entry.token,
      undefined,
      "src/lib/video/links.ts must store tokenHash, never token",
    );
    assert.ok(entry.tokenHash, "every shipped entry needs a tokenHash");
    assert.ok(entry.clips.length > 0);
  }
});

test("a plaintext token in the public links file is refused, not served", async () => {
  const token = generateToken();
  const entry = { token, clips: [{ uid: UID }] };

  const permissive = parseVideoLinks([entry]);
  assert.equal(permissive.links.length, 1, "fine in PRIVATE_VIDEO_LINKS");

  const strict = parseVideoLinks([entry], { requireHashedTokens: true });
  assert.equal(strict.links.length, 0, "refused in links.ts");
  assert.match(strict.warnings[0]!.problem, /plaintext token/);
  assert.ok(!strict.warnings[0]!.problem.includes(token), "and never echoed");
});

test("parseVideoLinks validates the shape of a tokenHash", async () => {
  const good = { tokenHash: await hashToken(generateToken()), clips: [{ uid: UID }] };
  assert.equal(parseVideoLinks([good], { requireHashedTokens: true }).links.length, 1);

  for (const bad of ["", "too-short", "a".repeat(44), "a".repeat(43) + "!", 7]) {
    const { links, warnings } = parseVideoLinks([
      { tokenHash: bad, clips: [{ uid: UID }] },
    ]);
    assert.equal(links.length, 0, JSON.stringify(bad));
    assert.match(warnings[0]!.problem, /tokenHash|token/);
  }

  const both = {
    tokenHash: good.tokenHash,
    token: generateToken(),
    clips: [{ uid: UID }],
  };
  assert.match(parseVideoLinks([both]).warnings[0]!.problem, /not both/);
});

test("resolveVideoLink matches a token against its hash", async () => {
  const token = generateToken();
  const only: VideoLink = { tokenHash: await hashToken(token), clips: [{ uid: UID }] };
  assert.equal((await resolveVideoLink(token, [only]))?.tokenHash, only.tokenHash);
  assert.equal(await resolveVideoLink(generateToken(), [only]), null);
});

test("videoLinkKey is the same for both forms of the same link", async () => {
  const token = generateToken();
  const hash = await hashToken(token);
  assert.equal(await videoLinkKey({ token, clips: [{ uid: UID }] }), hash);
  assert.equal(await videoLinkKey({ tokenHash: hash, clips: [{ uid: UID }] }), hash);
});
