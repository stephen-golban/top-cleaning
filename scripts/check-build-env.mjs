#!/usr/bin/env node
/**
 * Refuse to ship a Worker bundle that carries a secret.
 *
 *   node scripts/check-build-env.mjs
 *
 * `@opennextjs/cloudflare` snapshots whatever `next` loaded from `.env`,
 * `.env.local` and `.env.production` at build time into
 * `.open-next/cloudflare/next-env.mjs`, and that file is bundled into the
 * uploaded Worker. So a `TELEGRAM_BOT_TOKEN=` line in `.env.local` does not
 * merely configure the local machine — it is uploaded to Cloudflare in
 * plaintext inside the script, where it shadows the real `wrangler secret`,
 * survives `wrangler secret delete`, and is readable by anyone who can read
 * the Worker. This happened on 2026-09-02 and is why this check exists.
 *
 * The rule this enforces is the one Next already implies: only `NEXT_PUBLIC_*`
 * is safe to inline, because only `NEXT_PUBLIC_*` is meant to be public.
 * Runtime secrets belong in `wrangler secret put` for production and in
 * `.dev.vars` for local `wrangler dev` — neither of which the build can see.
 *
 * Runs between `opennextjs-cloudflare build` and `... deploy`, so a mistake is
 * a failed deploy rather than a leaked credential.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ENV_MODULE = path.resolve(process.cwd(), ".open-next/cloudflare/next-env.mjs");

/** The only prefix Next is willing to expose to a browser, and so the only one safe to bundle. */
const PUBLIC_PREFIX = "NEXT_PUBLIC_";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!existsSync(ENV_MODULE)) {
  // Not "nothing to check": either the build did not run, or OpenNext moved
  // the file and this guard has quietly stopped guarding anything. Both are
  // reasons to stop, not to continue.
  fail(
    `${path.relative(process.cwd(), ENV_MODULE)} does not exist.\n` +
      "  Run `opennextjs-cloudflare build` first. If the build did run, OpenNext\n" +
      "  has moved its build-time env snapshot and this check needs updating —\n" +
      "  do not deploy until it does, or a secret could ship unnoticed.",
  );
}

const snapshot = await import(pathToFileURL(ENV_MODULE).href);

const leaked = [];
for (const [mode, values] of Object.entries(snapshot)) {
  for (const key of Object.keys(values ?? {})) {
    if (!key.startsWith(PUBLIC_PREFIX)) leaked.push(`${mode}.${key}`);
  }
}

if (leaked.length > 0) {
  fail(
    `the build bundled ${leaked.length} non-public variable(s) into the Worker:\n` +
      leaked.map((k) => `    ${k}`).join("\n") +
      "\n\n" +
      "  These were read out of a .env file at build time and would be uploaded\n" +
      "  to Cloudflare in plaintext inside the Worker script.\n\n" +
      "  Fix: take them out of .env / .env.local / .env.production and set them as\n" +
      "  runtime configuration instead —\n\n" +
      "    production:  npx wrangler secret put <NAME>\n" +
      "    local dev:   put <NAME>=... in .dev.vars (gitignored, never bundled)\n\n" +
      "  Only NEXT_PUBLIC_* belongs in a .env file. See .agents/DEPLOY.md.",
  );
}

const inlined = Object.keys(snapshot.production ?? {});
console.log(
  `✓ build env clean — ${inlined.length} inlined variable(s): ${inlined.join(", ") || "(none)"}`,
);
