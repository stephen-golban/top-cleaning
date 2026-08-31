#!/usr/bin/env node
/**
 * Cloudflare Stream operator helper.
 *
 *   pnpm video:stream keys        # create a signing key, save it to .env.local
 *   pnpm video:stream list        # list videos and whether each is locked
 *   pnpm video:stream lock <UID>  # turn on requireSignedURLs for one video
 *   pnpm video:stream subdomain   # print CF_STREAM_CUSTOMER_SUBDOMAIN
 *   pnpm video:stream check <UID> # mint a token locally and print a test URL
 *
 * Needs `CF_ACCOUNT_ID` and `CF_STREAM_API_TOKEN` in `.env.local`. Secrets are
 * written to files, never printed — the one exception is `check`, which prints a
 * short-lived playback URL because testing it is the entire point.
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
const ENV_FILE = path.resolve(process.cwd(), ".env.local");
const PEM_FILE = path.resolve(process.cwd(), "stream-signing-key.pem");

function loadEnv() {
  if (existsSync(ENV_FILE)) {
    try {
      process.loadEnvFile(ENV_FILE);
    } catch (error) {
      fail(`could not read .env.local: ${error.message}`);
    }
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(
      `${name} is not set.\n  Add it to .env.local — see .agents/video-setup.md step 1.`,
    );
  }
  return value;
}

async function cf(pathname, init = {}) {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const token = requireEnv("CF_STREAM_API_TOKEN");

  const response = await fetch(`${API}/accounts/${accountId}${pathname}`, {
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

/** Upsert a KEY=value line in .env.local without disturbing the rest. */
function writeEnvVar(name, value) {
  const line = `${name}="${value}"`;
  let contents = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    if (contents && !contents.endsWith("\n")) contents += "\n";
    contents += `${line}\n`;
  }
  writeFileSync(ENV_FILE, contents, { mode: 0o600 });
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

async function createKey() {
  const result = await cf("/stream/keys", { method: "POST" });

  writeEnvVar("CF_STREAM_SIGNING_KEY_ID", result.id);
  writeEnvVar("CF_STREAM_SIGNING_KEY_PEM", result.pem);
  writeFileSync(PEM_FILE, `${result.pem}\n`, { mode: 0o600 });

  console.log(`\n✓ Signing key created.  Key ID: ${result.id}`);
  console.log(`  Saved to ${ENV_FILE} (the private key is NOT printed here).`);
  console.log(`  Also written to ${PEM_FILE} — gitignored by the \`*.pem\` rule.`);
  console.log("\nCloudflare shows a signing key's private half exactly once.");
  console.log("Copy those two files somewhere safe now (a password manager).");
  console.log("\nPush them to production with:");
  console.log("  wrangler secret put CF_STREAM_SIGNING_KEY_ID");
  console.log(
    `  wrangler secret put CF_STREAM_SIGNING_KEY_PEM < ${path.basename(PEM_FILE)}`,
  );
  console.log("");
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
  console.log(
    "Add that line to .env.local, and `wrangler secret put` it for production.\n",
  );
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

  keys            Create a Stream signing key and save it to .env.local
  list            List videos and show which require signed URLs
  lock <UID>      Require signed URLs for one video
  subdomain       Print the CF_STREAM_CUSTOMER_SUBDOMAIN for this account
  check [UID]     Verify the local signing config; mint a test URL if given a UID`;

async function main() {
  loadEnv();
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
