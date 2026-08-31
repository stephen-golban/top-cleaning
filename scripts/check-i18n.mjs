#!/usr/bin/env node
/**
 * Asserts that every file in `messages/` has exactly the same key set.
 *
 * `pnpm typecheck` already fails on divergence (see `src/i18n/message-parity.ts`),
 * but a structural type error is close to unreadable. This prints the key paths.
 *
 * Run with `pnpm check:i18n`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");

/** Locale files to compare. The first one is the reference. */
const locales = ["ro", "ru", "en"];

/** Every leaf path in a message tree, e.g. `meta.home.title`. */
function keyPaths(node, prefix = "") {
  if (node === null || typeof node !== "object") return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

function load(locale) {
  const path = join(messagesDir, `${locale}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    console.error(`✗ ${locale}.json could not be read or parsed: ${cause.message}`);
    process.exit(1);
  }
}

const [reference, ...others] = locales;
const referenceKeys = new Set(keyPaths(load(reference)));

let failed = false;

for (const locale of others) {
  const keys = new Set(keyPaths(load(locale)));
  const missing = [...referenceKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !referenceKeys.has(key));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${locale}.json matches ${reference}.json (${keys.size} keys)`);
    continue;
  }

  failed = true;
  console.error(`✗ ${locale}.json does not match ${reference}.json`);
  for (const key of missing) console.error(`    missing: ${key}`);
  for (const key of extra) console.error(`    orphan:  ${key}`);
}

if (failed) {
  console.error(
    "\nEvery locale must carry the same keys. Add the missing ones or remove the orphans.",
  );
  process.exit(1);
}
