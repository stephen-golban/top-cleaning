#!/usr/bin/env node
/**
 * Find the Telegram chat id that quote requests should be delivered to.
 *
 *   pnpm telegram:chat-id
 *
 * Reads `TELEGRAM_BOT_TOKEN` from `.dev.vars` (or the environment) and calls
 * the bot's `getUpdates`. The token is never printed and never typed on a
 * command line, so it does not end up in shell history or in a chat window.
 *
 * A bot cannot start a conversation. Send `/start` to the bot from the account
 * that should receive quotes *before* running this, or there will be nothing to
 * read.
 *
 * See `.agents/telegram-setup.md` for the full walkthrough.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Where a runtime secret lives on a developer's machine.
 *
 * `.dev.vars` and not `.env.local`: Next loads `.env*` at *build* time and
 * OpenNext bundles whatever it loaded into the uploaded Worker, so a token in
 * `.env.local` ships to Cloudflare in plaintext. `.dev.vars` is read by
 * `wrangler dev` at runtime and is never bundled. `.env.local` is still
 * accepted here so an older checkout keeps working.
 */
const ENV_FILES = [
  path.resolve(process.cwd(), ".dev.vars"),
  path.resolve(process.cwd(), ".env.local"),
];
const API = "https://api.telegram.org";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function loadEnv() {
  // First one that exists wins, so a checkout that still has both does not
  // silently prefer the stale copy.
  const file = ENV_FILES.find((candidate) => existsSync(candidate));
  if (!file) return;
  try {
    process.loadEnvFile(file);
  } catch (error) {
    fail(`could not read ${path.basename(file)}: ${error.message}`);
  }
}

/**
 * Keep the token out of anything printed. It is in the request path, so any
 * error that quotes a URL quotes the credential.
 */
function redact(text, token) {
  return String(text).split(token).join("<redacted>");
}

function describeChat(chat) {
  const person = [chat.first_name, chat.last_name].filter(Boolean).join(" ");
  const name = chat.title || person || chat.username || "(no name)";
  const handle = chat.username ? ` @${chat.username}` : "";
  return `${name}${handle} — ${chat.type}`;
}

async function main() {
  loadEnv();

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    fail(
      "TELEGRAM_BOT_TOKEN is not set.\n" +
        "  Put it in .dev.vars as a single line:\n" +
        '    TELEGRAM_BOT_TOKEN="123456789:AA..."\n' +
        "  See .agents/telegram-setup.md step 1.",
    );
  }

  let response;
  try {
    response = await fetch(`${API}/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    fail(`could not reach Telegram: ${redact(error.message, token)}`);
  }

  const body = await response.text();

  if (!response.ok) {
    const hint =
      response.status === 401
        ? "\n  A 401 means the token is wrong. Copy it again from @BotFather."
        : "";
    fail(`Telegram responded ${response.status}: ${redact(body, token)}${hint}`);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    fail(`Telegram returned something that is not JSON: ${redact(body, token)}`);
  }

  const updates = Array.isArray(payload.result) ? payload.result : [];

  /** Chat id → description, first sighting wins. */
  const chats = new Map();
  for (const update of updates) {
    const message =
      update.message ??
      update.edited_message ??
      update.channel_post ??
      update.my_chat_member;
    const chat = message?.chat;
    if (chat && typeof chat.id === "number" && !chats.has(chat.id)) {
      chats.set(chat.id, describeChat(chat));
    }
  }

  if (chats.size === 0) {
    console.error("\n✗ Telegram has no messages for this bot.\n");
    console.error("  A bot cannot message someone who has never messaged it first.");
    console.error("  Open Telegram, find your bot, press START (or send /start),");
    console.error("  then run this again:\n");
    console.error("    pnpm telegram:chat-id\n");
    console.error(
      "  Note: Telegram forgets updates after 24 hours, and reading them once\n" +
        "  clears them — if you ran this before, just send the bot another message.\n",
    );
    process.exit(1);
  }

  console.log(`\n${"─".repeat(72)}`);
  for (const [id, description] of chats) {
    console.log(`  TELEGRAM_CHAT_ID="${id}"    ${description}`);
  }
  console.log(`${"─".repeat(72)}`);

  if (chats.size > 1) {
    console.log(
      "\nMore than one chat has messaged this bot. Pick the line for the account\n" +
        "or group that should receive quote requests.",
    );
  }

  console.log("\nNext:");
  console.log("  1. Add that line to .dev.vars.");
  console.log("  2. Send both secrets to the live site:");
  console.log("       wrangler secret put TELEGRAM_BOT_TOKEN");
  console.log("       wrangler secret put TELEGRAM_CHAT_ID");
  console.log("  3. Redeploy:  pnpm deploy\n");
  console.log("The chat id is not secret, but the bot token is. Do not paste the");
  console.log("token into a chat, an email, or a command line.\n");
}

await main();
