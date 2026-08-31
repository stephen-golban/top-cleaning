#!/usr/bin/env node
/**
 * Generate secret tokens for private video links.
 *
 *   pnpm video:token
 *   pnpm video:token --count 3
 *   pnpm video:token --base https://topcleaning.md
 *
 * Each token is 24 random bytes (192 bits) rendered as URL-safe base64. Guessing
 * one is not a realistic attack; losing one is. Treat the output like a key.
 */
import { randomBytes } from "node:crypto";
import process from "node:process";

const LOCALES = ["ro", "ru", "en"];

function parseArgs(argv) {
  const args = {
    count: 1,
    base: process.env.NEXT_PUBLIC_SITE_URL ?? "https://topcleaning.md",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--count" || arg === "-n") {
      args.count = Number.parseInt(argv[++i] ?? "", 10);
    } else if (arg === "--base" || arg === "-b") {
      args.base = argv[++i] ?? args.base;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 50) {
    throw new Error("--count must be between 1 and 50");
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n`);
    console.error(
      "Usage: pnpm video:token [--count N] [--base https://topcleaning.md]",
    );
    process.exit(1);
  }

  if (args.help) {
    console.log("Usage: pnpm video:token [--count N] [--base https://topcleaning.md]");
    return;
  }

  for (let i = 0; i < args.count; i += 1) {
    const token = generateToken();

    console.log(`\n${"─".repeat(72)}`);
    console.log(`Token   ${token}`);
    console.log(`${"─".repeat(72)}`);
    console.log("\nLinks (any of these opens the same video):");
    for (const locale of LOCALES) {
      console.log(`  ${locale}   ${args.base}/${locale}/v/${token}`);
    }

    console.log("\nPaste this into the array in src/lib/video/links.ts:\n");
    console.log("  {");
    console.log(`    token: ${JSON.stringify(token)},`);
    console.log("    title: {");
    console.log('      ro: "…",');
    console.log('      ru: "…",');
    console.log('      en: "…",');
    console.log("    },");
    console.log('    clips: [{ uid: "PASTE_THE_32_CHARACTER_STREAM_UID_HERE" }],');
    console.log("  },");
    console.log("\nThen make the QR code:");
    console.log(`  pnpm video:qr ${token}`);
  }

  console.log("\nThis token IS the password. Do not put it anywhere public.\n");
}

main();
