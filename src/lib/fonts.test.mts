import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { coverage, fontPreloads } from "./fonts.ts";
import { sansFiles, serifFiles } from "./fonts.generated.ts";

/**
 * The HARD CONSTRAINT from `.agents/DECISIONS.md`, tested against the whole
 * corpus rather than a sample.
 *
 * `src/lib/fonts.ts` carries a compile-time version of this over a handful of
 * hand-written strings. That catches a subset that lost Cyrillic entirely. It
 * cannot catch the interesting case: someone adds one word of new copy whose
 * character the subset does not have. So this walks every string in
 * `messages/` and every source file under `src/`, and checks each character
 * against the coverage read out of the shipped woff2 files' own `cmap`.
 *
 * A miss is never a broken page — each `@font-face`'s `unicode-range` is
 * generated from that same `cmap`, so an uncovered character is not claimed by
 * the family and falls through to the system stack. It is a *quality* failure:
 * one word in Georgia in the middle of a Literata heading. Fix it by widening
 * the sets in `scripts/build-fonts.py` and re-running `pnpm fonts:build`.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/** Every character of the site's own copy and code, closed under case. */
function corpus(): Map<string, string> {
  const files: string[] = [];

  const messages = join(repoRoot, "messages");
  for (const name of readdirSync(messages)) {
    if (name.endsWith(".json")) files.push(join(messages, name));
  }

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|mts|css)$/.test(entry.name)) files.push(path);
    }
  };
  walk(join(repoRoot, "src"));

  // character → the file it was first seen in, so a failure names a place.
  const seen = new Map<string, string>();
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    for (const char of text) {
      // `text-transform: uppercase` on the eyebrows means the rendered page
      // contains characters no source file literally does.
      for (const variant of [char, char.toUpperCase(), char.toLowerCase()]) {
        if (variant.length === 1 && !seen.has(variant)) {
          seen.set(variant, path.slice(repoRoot.length + 1));
        }
      }
    }
  }
  return seen;
}

/** Characters that are never laid out as text, so no font has to draw them. */
const NOT_RENDERED = new Set([
  "\n",
  "\r",
  "\t",
  "─", // ─ box drawing, only in comment rules
  "→", // → only in comments
  "≥", // ≥ only in comments
  "≤",
  "×", // × only in comments
]);

for (const [face, covered] of Object.entries(coverage)) {
  test(`the ${face} subsets cover every character in messages/ and src/`, () => {
    const drawable = new Set(covered);
    const missing: string[] = [];
    for (const [char, where] of corpus()) {
      if (char.codePointAt(0)! < 0x20 || NOT_RENDERED.has(char)) continue;
      if (!drawable.has(char)) {
        missing.push(
          `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(char)} (${where})`,
        );
      }
    }
    assert.deepEqual(
      missing,
      [],
      `${face} cannot draw these; widen scripts/build-fonts.py and re-run pnpm fonts:build`,
    );
  });
}

test("both faces still draw Russian", () => {
  // The bug the old site shipped: the whole Russian site in a fallback serif.
  const russian =
    "Уборка после ремонта Кишинёв Услуги Профессиональные " +
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя №";
  for (const [face, covered] of Object.entries(coverage)) {
    const drawable = new Set(covered);
    for (const char of russian) {
      assert.ok(drawable.has(char), `${face} cannot draw ${JSON.stringify(char)}`);
    }
  }
});

test("both faces still draw Romanian diacritics", () => {
  const romanian = "ăâîșț ĂÂÎȘȚ şţ ŞŢ Curățenie după reparație Chișinău";
  for (const [face, covered] of Object.entries(coverage)) {
    const drawable = new Set(covered);
    for (const char of romanian) {
      assert.ok(drawable.has(char), `${face} cannot draw ${JSON.stringify(char)}`);
    }
  }
});

test("the committed woff2 files match the hashes in their names", () => {
  for (const family of [serifFiles, sansFiles]) {
    for (const subset of [family.latin, family.cyrillic] as const) {
      const path = join(repoRoot, "public", subset.file);
      const bytes = readFileSync(path);
      assert.equal(bytes.length, subset.bytes, `${subset.file} size drifted`);
      const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
      const named = subset.file.replace(/^.*\.([0-9a-f]{10})\.woff2$/, "$1");
      assert.equal(
        digest,
        named,
        `${subset.file} was edited by hand — re-run pnpm fonts:build`,
      );
    }
  }
});

test("only /ru puts Cyrillic on the critical path", () => {
  const cyrillic = [serifFiles.cyrillic.file, sansFiles.cyrillic.file];

  for (const locale of ["ro", "en"] as const) {
    const hrefs = fontPreloads(locale).map((preload) => preload.href);
    // Typed `string[]` on purpose: `assert.deepEqual` is declared
    // `asserts actual is T`, so an expected array of file-name literals would
    // narrow `hrefs` and make the Cyrillic check below a type error instead of
    // the runtime check it is meant to be.
    const latinOnly: string[] = [serifFiles.latin.file, sansFiles.latin.file];
    assert.deepEqual(hrefs, latinOnly);
    for (const file of cyrillic) assert.ok(!hrefs.includes(file));
  }

  const ru = fontPreloads("ru").map((preload) => preload.href);
  for (const file of cyrillic) {
    assert.ok(ru.includes(file), `/ru must preload ${file}`);
  }
  assert.ok(ru.includes(serifFiles.latin.file), "/ru still sets the wordmark in Latin");
  assert.ok(
    ru.includes(sansFiles.latin.file),
    "/ru still sets the phone number in Latin",
  );
});
