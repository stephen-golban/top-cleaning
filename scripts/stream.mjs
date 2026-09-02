#!/usr/bin/env node
/**
 * Cloudflare Stream operator helper.
 *
 *   pnpm video:stream keys          # create a signing key, save it to .dev.vars
 *   pnpm video:stream upload <FILE> # upload a video, locked, and wait for encoding
 *   pnpm video:stream list          # list videos and whether each is locked
 *   pnpm video:stream lock <UID>    # turn on requireSignedURLs for one video
 *   pnpm video:stream subdomain     # print CF_STREAM_CUSTOMER_SUBDOMAIN
 *   pnpm video:stream check <UID>   # mint a token locally and print a test URL
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
import { createPrivateKey } from "node:crypto";
import { existsSync, openAsBlob, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
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
      // Only for JSON. A FormData body must set its own multipart boundary.
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const detail = body?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ");
    if (response.status === 403 || response.status === 401) {
      fail(
        `Cloudflare refused the request (HTTP ${response.status}).\n` +
          `  ${detail ?? "no detail"}\n\n` +
          "  The Stream API is ACCOUNT-scoped. The two things that cause this:\n" +
          "    1. the token's permission rows are not `Account -> Stream -> Edit`\n" +
          "       (a row set to Zone grants #stream:edit on zones, which does not\n" +
          "       authorise /accounts/<id>/stream at all); or\n" +
          "    2. `Account Resources` was left unset, so the token covers no\n" +
          `       account — including ${account}.\n\n` +
          "  Run `pnpm video:stream doctor` to see which of the two it is.\n" +
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

/**
 * Cloudflare hands back a PKCS#1 key (`BEGIN RSA PRIVATE KEY`), base64-wrapped.
 * `crypto.subtle.importKey` — which is all the Worker runtime has — only takes
 * PKCS#8. So convert once, here, rather than shipping a key the site cannot
 * load: the failure otherwise surfaces on the live site as an indistinguishable
 * 404 on every `/v/` link, with the real reason only in `wrangler tail`.
 * That is exactly what happened on 2026-09-02.
 *
 * Returns the PKCS#8 PEM text. Nothing is printed.
 *
 * Exported for `scripts/stream.test.mts`, which round-trips a locally generated
 * PKCS#1 key through here into `crypto.subtle.importKey` — the assertion that
 * would have caught the 2026-09-02 outage before it shipped.
 */
export function toPkcs8Pem(raw) {
  const unescaped = String(raw).trim().replace(/\\n/g, "\n");
  const pem = unescaped.includes("-----BEGIN")
    ? unescaped
    : Buffer.from(unescaped, "base64").toString("utf8").trim();

  if (!pem.includes("-----BEGIN")) {
    fail("Cloudflare returned a signing key in a shape this script cannot read.");
  }

  // `createPrivateKey` parses PKCS#1 and PKCS#8 alike; the export picks the one
  // Web Crypto needs. A key that is already PKCS#8 passes through unchanged.
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).trim();
}

async function createKey() {
  const result = await cf("/stream/keys", { method: "POST" });

  const pkcs8 = toPkcs8Pem(result.pem);

  writeDevVar("CF_STREAM_SIGNING_KEY_ID", result.id);
  // `.dev.vars` cannot hold a newline, so the PEM goes in base64-wrapped —
  // the same shape Cloudflare uses, and one `normalizePrivateKeyPem` accepts.
  writeDevVar(
    "CF_STREAM_SIGNING_KEY_PEM",
    Buffer.from(pkcs8, "utf8").toString("base64"),
  );
  writeFileSync(PEM_FILE, `${pkcs8}\n`, { mode: 0o600 });

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
/* Upload                                                                     */
/* -------------------------------------------------------------------------- */

/** Cloudflare's limit for a single-request upload. Above it, use the dashboard. */
const MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;

/** How long to wait for Cloudflare to finish encoding before giving up. */
const ENCODE_TIMEOUT_MS = 30 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Upload one video and lock it in the same breath.
 *
 * `requireSignedURLs` is set in the upload request itself rather than after the
 * fact, so the video is never, even briefly, playable by UID alone. It is then
 * read back and asserted, because "I set the flag" and "the flag is set" are
 * different claims and only the second one is the security property.
 */
async function uploadVideo(file, name) {
  if (!file) fail("usage: pnpm video:stream upload <FILE> [name]");

  const resolved = path.resolve(process.cwd(), file);
  if (!existsSync(resolved)) fail(`no such file: ${resolved}`);

  const { size } = statSync(resolved);
  if (size > MAX_DIRECT_UPLOAD_BYTES) {
    fail(
      `${path.basename(resolved)} is ${(size / 1024 / 1024).toFixed(0)} MB; the\n` +
        `  single-request upload limit is ${MAX_DIRECT_UPLOAD_BYTES / 1024 / 1024} MB.\n` +
        "  Upload it in the Stream dashboard instead, then run:\n" +
        "    pnpm video:stream lock <UID>",
    );
  }

  const label = name ?? path.basename(resolved);
  console.log(
    `\nUploading ${path.basename(resolved)} (${(size / 1024 / 1024).toFixed(1)} MB) as "${label}"…`,
  );

  const form = new FormData();
  form.set("file", await openAsBlob(resolved), path.basename(resolved));
  form.set("requireSignedURLs", "true");
  form.set("meta", JSON.stringify({ name: label }));

  const created = await cf("/stream", { method: "POST", body: form });
  console.log(`  uploaded. UID: ${created.uid}`);

  // Belt and braces: if the form field were ever ignored, this closes the gap.
  if (!created.requireSignedURLs) {
    console.log("  the upload did not come back locked — locking it now.");
    await cf(`/stream/${created.uid}`, {
      method: "POST",
      body: JSON.stringify({ requireSignedURLs: true }),
    });
  }

  const video = await waitForReady(created.uid);

  if (!video.requireSignedURLs) {
    fail(
      `${video.uid} is NOT locked. It is playable by anyone who learns the UID.\n` +
        `  Run: pnpm video:stream lock ${video.uid}`,
    );
  }

  console.log(
    `\n✓ ${video.uid}  LOCKED  ready  ${Math.round(video.duration ?? 0)}s  ` +
      `${video.input?.width ?? "?"}x${video.input?.height ?? "?"}`,
  );
  console.log("\nRegister it in src/lib/video/links.ts as:");
  console.log(`  clips: [{ uid: "${video.uid}" }]\n`);
}

/** Poll until Cloudflare has finished encoding, reporting progress as it goes. */
async function waitForReady(uid) {
  const deadline = Date.now() + ENCODE_TIMEOUT_MS;
  let lastReported = -1;

  for (;;) {
    const video = await cf(`/stream/${uid}`);
    if (video.readyToStream) return video;

    const state = video.status?.state ?? "unknown";
    if (state === "error") {
      fail(
        `Cloudflare could not encode ${uid}: ` +
          `${video.status?.errorReasonText ?? "no reason given"}`,
      );
    }

    const pct = Number.parseInt(video.status?.pctComplete ?? "", 10);
    if (Number.isFinite(pct) && pct !== lastReported) {
      console.log(`  encoding… ${pct}%`);
      lastReported = pct;
    }

    if (Date.now() > deadline) {
      fail(
        `${uid} was still ${state} after 30 minutes.\n` +
          "  It is uploaded and locked; check `pnpm video:stream list` later.",
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

/* -------------------------------------------------------------------------- */
/* Doctor                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Say precisely which of the ways an API token can be wrong is the one in play.
 *
 * This exists because a token can be perfectly valid, and even carry
 * `#stream:edit`, and still be useless here: if its permission rows were set to
 * `Zone` rather than `Account`, Cloudflare grants Stream on zones, and the
 * Stream API lives under `/accounts/<id>/stream`. The 403 that comes back says
 * only "Authorization Failure", which sends people to re-check the permission
 * they already have. Nothing below prints any part of the token.
 */
async function doctor() {
  const account = accountId();
  const token = apiToken();
  const auth = { Authorization: `Bearer ${token}` };

  const probe = async (pathname) => {
    const response = await fetch(`${API}${pathname}`, { headers: auth });
    const body = await response.json().catch(() => null);
    return { ok: response.ok && body?.success === true, status: response.status, body };
  };

  console.log(`\nAccount:  ${account}`);
  console.log(`Token:    present (${token.length} characters, never printed)\n`);

  const verify = await probe("/user/tokens/verify");
  console.log(
    verify.ok
      ? `  [ok]   the token is valid and ${verify.body.result.status}`
      : `  [FAIL] Cloudflare does not accept this token (HTTP ${verify.status})`,
  );
  if (!verify.ok) {
    return fail("the token is invalid or revoked. Redo .agents/video-setup.md step 1.");
  }

  const accounts = await probe("/accounts");
  const ids = accounts.ok ? accounts.body.result.map((entry) => entry.id) : [];
  if (!accounts.ok) {
    console.log(`  [FAIL] cannot list accounts (HTTP ${accounts.status})`);
    console.log("         the token is missing `Account Settings: Read`.");
  } else if (ids.length === 0) {
    console.log("  [FAIL] the token is scoped to NO account.");
    console.log("         Its permission rows are Zone-level, or `Account Resources`");
    console.log("         was left unset. The Stream API is account-scoped, so it");
    console.log("         cannot work from here whatever permissions it holds.");
  } else if (!ids.includes(account)) {
    console.log(`  [FAIL] the token covers ${ids.length} account(s), not ${account}.`);
  } else {
    console.log(`  [ok]   the token covers account ${account}`);
  }

  const stream = await probe(`/accounts/${account}/stream?limit=1`);
  console.log(
    stream.ok
      ? "  [ok]   Stream: Edit works on this account"
      : `  [FAIL] Stream is refused on this account (HTTP ${stream.status})`,
  );

  if (verify.ok && accounts.ok && ids.includes(account) && stream.ok) {
    console.log(
      "\nEverything checks out. Carry on at .agents/video-setup.md step 3.\n",
    );
    return;
  }

  fail(
    "make a new token at https://dash.cloudflare.com/profile/api-tokens with\n" +
      "  BOTH permission rows set to `Account` (not Zone):\n" +
      "      Account | Stream           | Edit\n" +
      "      Account | Account Settings | Read\n" +
      "  and `Account Resources` set to `Include | <your account>`.\n" +
      "  Then replace CF_STREAM_API_TOKEN in .dev.vars. Full instructions:\n" +
      "  .agents/video-setup.md step 1.",
  );
}

/* -------------------------------------------------------------------------- */

const USAGE = `Usage: pnpm video:stream <command>

  doctor            Explain exactly why the API token is or is not usable
  keys              Create a Stream signing key and save it to .dev.vars
  upload <FILE> [N] Upload a video with signed URLs required, and wait for encoding
  list              List videos and show which require signed URLs
  lock <UID>        Require signed URLs for one video
  subdomain         Print the CF_STREAM_CUSTOMER_SUBDOMAIN for this account
  check [UID]       Verify the local signing config; mint a test URL if given a UID

Credentials are read from .dev.vars (never .env.local, which is bundled into the
deployed Worker). See .agents/video-setup.md.`;

async function main() {
  loadEnv();
  warnAboutLegacyEnvFile();
  const [command, argument, ...rest] = process.argv.slice(2);

  switch (command) {
    case "doctor":
      return doctor();
    case "keys":
    case "keys:create":
      return createKey();
    case "upload":
      return uploadVideo(argument, rest.join(" ") || undefined);
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

// Only run the CLI when this file is the entry point. Importing it — which the
// test does, to reach `toPkcs8Pem` — must not fire off a command or call
// `process.exit`, which would take the test runner down with it.
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
