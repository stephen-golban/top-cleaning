#!/usr/bin/env node
/**
 * Cloudflare Stream operator helper.
 *
 *   pnpm video:stream keys        # create a signing key, save it to .dev.vars
 *   pnpm video:stream list        # list videos and whether each is locked
 *   pnpm video:stream lock <UID>  # turn on requireSignedURLs for one video
 *   pnpm video:stream subdomain   # print CF_STREAM_CUSTOMER_SUBDOMAIN
 *   pnpm video:stream check <UID> # mint a token locally and print a test URL
 *
 * There are two kinds of Stream credential here and the difference is the whole
 * point of this file:
 *
 *   CF_ACCOUNT_ID, CF_STREAM_API_TOKEN — LOCAL CLI ONLY.
 *     They authenticate this machine to Cloudflare's management API so it can
 *     mint signing keys and lock videos. The deployed Worker never needs them,
 *     so it must never be given them. Do not `wrangler secret put` these.
 *
 *   CF_STREAM_SIGNING_KEY_ID, CF_STREAM_SIGNING_KEY_PEM — WORKER RUNTIME.
 *     The site signs short-lived playback JWTs with them on every request to a
 *     `/v/` page. Locally they belong in `.dev.vars`; in production they are set
 *     with `wrangler secret put` (a runtime change — no redeploy).
 *
 * Both kinds are read from, and written to, `.dev.vars` — never `.env.local`.
 * Next loads `.env*` at *build* time and `@opennextjs/cloudflare` copies whatever
 * it loaded into `.open-next/cloudflare/next-env.mjs`, which is bundled into the
 * Worker that gets uploaded. A key in `.env.local` is therefore a key published
 * inside the site's own source, where it shadows the real `wrangler secret` and
 * survives `wrangler secret delete`. That happened on 2026-09-02 with a Telegram
 * bot token, which had to be revoked and rotated. `scripts/check-build-env.mjs`
 * now aborts any deploy whose bundle carries a non-`NEXT_PUBLIC_*` variable.
 * `.dev.vars` is read by `wrangler dev` at runtime and is never bundled.
 *
 * Secrets are written to files, never printed — the one exception is `check`,
 * which prints a short-lived playback URL because testing it is the entire point.
 *
 * See `.agents/video-setup.md` for the full walkthrough.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  signPlaybackToken,
  readStreamConfig,
  iframeUrl,
  thumbnailUrl,
} from "../src/lib/stream.ts";

const API = "https://api.cloudflare.com/client/v4";

/** Where every credential this script touches lives. Gitignored, never bundled. */
const DEV_VARS_FILE = path.resolve(process.cwd(), ".dev.vars");

/**
 * Still *read* — an older checkout may have credentials here — but never
 * written, and loudly complained about. `.dev.vars` wins on any conflict.
 */
const LEGACY_ENV_FILE = path.resolve(process.cwd(), ".env.local");

/** Gitignored by the `*.pem` rule. Exists so the PEM can be piped into wrangler. */
const PEM_FILE = path.resolve(process.cwd(), "stream-signing-key.pem");

/**
 * The account that owns the Stream videos, recorded in `.agents/infra.md`.
 * An account ID is an identifier, not a credential — it is on every page of the
 * Cloudflare dashboard — so it is a default rather than something to configure.
 * `CF_ACCOUNT_ID` in the environment still overrides it.
 */
const DEFAULT_ACCOUNT_ID = "b8348ba8b3e65b3b3dd2ad6324a280f6";

/** The only prefix Next is willing to expose to a browser, and so to bundle. */
const PUBLIC_PREFIX = "NEXT_PUBLIC_";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Load `.dev.vars` first, then `.env.local`.
 *
 * `process.loadEnvFile` does not overwrite a variable that is already set, so
 * this ordering gives precedence: real shell environment > `.dev.vars` >
 * `.env.local`. The stale copy in an old `.env.local` can never win.
 */
function loadEnv() {
  for (const file of [DEV_VARS_FILE, LEGACY_ENV_FILE]) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch (error) {
      fail(`could not read ${path.basename(file)}: ${error.message}`);
    }
  }
}

/** Variable names defined in a file, without reading a single value. */
function envFileKeys(file) {
  const contents = readFileSync(file, "utf8");
  return [...contents.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map(
    (match) => match[1],
  );
}

/**
 * `.env.local` is bundled into the Worker. Anything in it that is not
 * `NEXT_PUBLIC_*` is a credential on its way to being published, and would fail
 * the deploy at `scripts/check-build-env.mjs`. Say so now rather than at deploy.
 */
function warnAboutLegacyEnvFile() {
  if (!existsSync(LEGACY_ENV_FILE)) return;

  let leaked;
  try {
    leaked = envFileKeys(LEGACY_ENV_FILE).filter(
      (key) => !key.startsWith(PUBLIC_PREFIX),
    );
  } catch {
    return; // Unreadable is not this command's problem.
  }
  if (leaked.length === 0) return;

  console.error(
    `\n⚠ .env.local defines ${leaked.length} non-public variable(s):\n` +
      leaked.map((key) => `    ${key}`).join("\n") +
      "\n\n" +
      "  Next reads .env.local at build time and OpenNext bundles what it read\n" +
      "  into the uploaded Worker, so these would ship to Cloudflare in plaintext.\n" +
      "  `pnpm deploy` will refuse until they are gone.\n\n" +
      "  Move each line into .dev.vars (runtime, gitignored, never bundled) and\n" +
      "  delete it from .env.local. Only NEXT_PUBLIC_* belongs in a .env file.\n",
  );
}

/**
 * Upsert a `KEY="value"` line in `.dev.vars` without disturbing the rest.
 * Created with owner-only permissions if it does not exist yet.
 */
function writeDevVar(name, value) {
  if (/[\r\n]/.test(value)) {
    // A multi-line value would silently truncate on read and there is no
    // reliable escaping across the parsers involved. Cloudflare returns the
    // signing key as a single-line base64 blob, so this should never fire.
    fail(
      `refusing to write ${name}: the value contains a newline.\n` +
        `  Use ${path.basename(PEM_FILE)} instead — it holds the same key.`,
    );
  }

  const line = `${name}="${value}"`;
  let contents = existsSync(DEV_VARS_FILE) ? readFileSync(DEV_VARS_FILE, "utf8") : "";
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    if (contents && !contents.endsWith("\n")) contents += "\n";
    contents += `${line}\n`;
  }
  writeFileSync(DEV_VARS_FILE, contents, { mode: 0o600 });
}

function accountId() {
  return process.env.CF_ACCOUNT_ID?.trim() || DEFAULT_ACCOUNT_ID;
}

function apiToken() {
  const value = process.env.CF_STREAM_API_TOKEN?.trim();
  if (!value) {
    fail(
      "CF_STREAM_API_TOKEN is not set.\n" +
        "  Put it in .dev.vars as a single line:\n" +
        '    CF_STREAM_API_TOKEN="paste-the-token-here"\n' +
        "  Not .env.local — that file is bundled into the deployed Worker.\n" +
        "  See .agents/video-setup.md step 2.",
    );
  }
  return value;
}

async function cf(pathname, init = {}) {
  const account = accountId();
  const token = apiToken();

  const response = await fetch(`${API}/accounts/${account}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const detail = body?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ");
    if (response.status === 403 || response.status === 401) {
      fail(
        `Cloudflare refused the request (HTTP ${response.status}).\n` +
          `  ${detail ?? "no detail"}\n` +
          "  The API token almost certainly lacks the Stream:Edit permission.\n" +
          "  See .agents/video-setup.md step 1.",
      );
    }
    fail(`Cloudflare API error (HTTP ${response.status}): ${detail ?? "unknown"}`);
  }
  return body.result;
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

async function createKey() {
  const result = await cf("/stream/keys", { method: "POST" });

  writeDevVar("CF_STREAM_SIGNING_KEY_ID", result.id);
  writeDevVar("CF_STREAM_SIGNING_KEY_PEM", result.pem);
  writeFileSync(PEM_FILE, `${result.pem}\n`, { mode: 0o600 });

  console.log(`\n✓ Signing key created.  Key ID: ${result.id}`);
  console.log(`  Saved to ${DEV_VARS_FILE} (the private key is NOT printed here).`);
  console.log(`  Also written to ${PEM_FILE} — gitignored by the \`*.pem\` rule.`);
  console.log("\nBoth files are gitignored and neither is ever bundled into the site.");
  console.log("Cloudflare shows a signing key's private half exactly once.");
  console.log("Copy those two files somewhere safe now (a password manager).");
  console.log("\nPush them to production with:");
  console.log("  wrangler secret put CF_STREAM_SIGNING_KEY_ID");
  console.log(
    `  wrangler secret put CF_STREAM_SIGNING_KEY_PEM < ${path.basename(PEM_FILE)}`,
  );
  console.log("\nA secret is a runtime binding: that takes effect on the next");
  console.log("request, with no redeploy.\n");
}

async function listVideos() {
  const videos = await cf("/stream?limit=100");
  if (!videos.length) {
    console.log("\nNo videos in this account yet.\n");
    return;
  }

  console.log("");
  for (const video of videos) {
    const locked = video.requireSignedURLs ? "LOCKED  " : "PUBLIC ⚠";
    const name = video.meta?.name ?? "(no name)";
    const ready = video.readyToStream ? "" : "  (still processing)";
    console.log(`${locked}  ${video.uid}  ${name}${ready}`);
  }
  console.log("\nPUBLIC videos are playable by anyone who learns the UID.");
  console.log("Lock them:  pnpm video:stream lock <UID>\n");
}

async function lockVideo(uid) {
  if (!/^[a-f0-9]{32}$/i.test(uid ?? "")) {
    fail("expected a 32-character Stream video UID:  pnpm video:stream lock <UID>");
  }
  const result = await cf(`/stream/${uid}`, {
    method: "POST",
    body: JSON.stringify({ requireSignedURLs: true }),
  });
  console.log(
    `\n✓ ${result.uid} now requires a signed URL (requireSignedURLs=${result.requireSignedURLs}).\n`,
  );
}

async function printSubdomain() {
  const videos = await cf("/stream?limit=1");
  const hls = videos[0]?.playback?.hls;
  if (!hls) {
    fail("no videos yet — upload one first, then run this again.");
  }
  const host = new URL(hls).host;
  console.log(`\nCF_STREAM_CUSTOMER_SUBDOMAIN="${host}"`);
  console.log("\nThis is a hostname, not a secret, but it is runtime configuration:");
  console.log("add that line to .dev.vars, and for production run");
  console.log("  wrangler secret put CF_STREAM_CUSTOMER_SUBDOMAIN");
  console.log("Do not put it in .env.local — that file is bundled into the Worker.\n");
}

async function check(uid) {
  const result = readStreamConfig(process.env);
  if (!result.ok) fail(result.reason);
  const config = result.config;

  console.log(`\n✓ Signing key ${config.keyId} loaded and parsed.`);
  console.log(`  Delivery host: ${config.deliveryHost}`);
  console.log(`  Token TTL:     ${config.ttlSeconds}s`);

  if (!uid) {
    console.log("\nPass a video UID to mint a real test URL:");
    console.log("  pnpm video:stream check <UID>\n");
    return;
  }

  const token = await signPlaybackToken({ videoUid: uid, config });
  console.log("\n✓ Playback token signed. Open this (expires soon):\n");
  console.log(`  ${iframeUrl(config, token)}`);
  console.log(
    `\nPoster frame:\n\n  ${thumbnailUrl(config, token, { timeSeconds: 1 })}\n`,
  );
}

/* -------------------------------------------------------------------------- */

const USAGE = `Usage: pnpm video:stream <command>

  keys            Create a Stream signing key and save it to .dev.vars
  list            List videos and show which require signed URLs
  lock <UID>      Require signed URLs for one video
  subdomain       Print the CF_STREAM_CUSTOMER_SUBDOMAIN for this account
  check [UID]     Verify the local signing config; mint a test URL if given a UID

Credentials are read from .dev.vars (never .env.local, which is bundled into the
deployed Worker). See .agents/video-setup.md.`;

async function main() {
  loadEnv();
  warnAboutLegacyEnvFile();
  const [command, argument] = process.argv.slice(2);

  switch (command) {
    case "keys":
    case "keys:create":
      return createKey();
    case "list":
      return listVideos();
    case "lock":
      return lockVideo(argument);
    case "subdomain":
      return printSubdomain();
    case "check":
      return check(argument);
    default:
      console.log(USAGE);
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
