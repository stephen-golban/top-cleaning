#!/usr/bin/env node
/**
 * Generate secret tokens for private video links.
 *
 *   pnpm video:token
 *   pnpm video:token --out qr-codes/curatenie.txt
 *   pnpm video:token --count 3
 *   pnpm video:token --base https://topcleaning.md
 *
 * Each token is 24 random bytes (192 bits) rendered as URL-safe base64. Guessing
 * one is not a realistic attack; losing one is. Treat the output like a key.
 *
 * Two values come out of this, and only one of them is a secret:
 *
 *   token      the secret link. Goes in your password manager, on the printed
 *              QR code, and nowhere else. NEVER in src/lib/video/links.ts.
 *   tokenHash  SHA-256 of the token. This is what links.ts stores, because that
 *              file is committed to a public repository. It identifies the link
 *              without being able to open it.
 *
 * `--out FILE` writes the secret half to a file instead of the terminal, so it
 * never lands in shell history or a session transcript. The file must be
 * gitignored; the script checks with `git check-ignore` and refuses otherwise.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
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
    } else if (arg === "--out" || arg === "-o") {
      args.out = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 50) {
    throw new Error("--count must be between 1 and 50");
  }
  if (args.out !== undefined && !args.out) throw new Error("--out needs a file path");
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * SHA-256, base64url. Must match `hashToken` in `src/lib/video/tokens.ts`, which
 * the Worker uses to recognise the token off the URL. `tokens.test.mts` pins the
 * two implementations to each other.
 */
function hashToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}

/**
 * A file that holds a token has to be one git will never take. Ask git rather
 * than pattern-matching the path: it is the same answer `git add` would give.
 */
function assertGitIgnored(file) {
  const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", file], {
    stdio: "ignore",
  });
  if (result.status === 0) return;
  throw new Error(
    `refusing to write a token to ${file}: git would not ignore it.\n` +
      "  Pick a path under qr-codes/ (already ignored), or add one to .gitignore.\n" +
      "  A token in git is a published password.",
  );
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n`);
    console.error(
      "Usage: pnpm video:token [--count N] [--out FILE] [--base https://topcleaning.md]",
    );
    process.exit(1);
  }

  if (args.help) {
    console.log(
      "Usage: pnpm video:token [--count N] [--out FILE] [--base https://topcleaning.md]",
    );
    return;
  }

  let outFile;
  if (args.out) {
    outFile = path.resolve(process.cwd(), args.out);
    try {
      mkdirSync(path.dirname(outFile), { recursive: true });
      assertGitIgnored(outFile);
    } catch (error) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
  }

  for (let i = 0; i < args.count; i += 1) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const links = LOCALES.map(
      (locale) => `${locale}   ${args.base}/${locale}/v/${token}`,
    );

    if (outFile) {
      appendFileSync(
        outFile,
        [
          `# Private video link, generated ${new Date().toISOString()}`,
          "# THIS FILE CONTAINS A SECRET. Do not commit, email, or upload it.",
          `TOKEN=${token}`,
          `TOKEN_HASH=${tokenHash}`,
          ...links.map((line) => `# ${line}`),
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
    }

    console.log(`\n${"-".repeat(72)}`);
    console.log(`Token hash   ${tokenHash}`);
    console.log(`${"-".repeat(72)}`);

    if (outFile) {
      console.log(`\nThe token itself was written to ${outFile} (gitignored).`);
      console.log("Copy it into your password manager, then make the QR with:");
      console.log(`  pnpm video:qr --token-file ${args.out}`);
    } else {
      console.log(`\nToken   ${token}`);
      console.log("\nLinks (any of these opens the same video):");
      for (const line of links) console.log(`  ${line}`);
      console.log("\nRe-run with --out FILE to keep the token out of the terminal.");
      console.log("\nThen make the QR code:");
      console.log(`  pnpm video:qr ${token}`);
    }

    console.log("\nPaste this into the array in src/lib/video/links.ts:\n");
    console.log("  {");
    console.log(`    tokenHash: ${JSON.stringify(tokenHash)},`);
    console.log("    title: {");
    console.log('      ro: "…",');
    console.log('      ru: "…",');
    console.log('      en: "…",');
    console.log("    },");
    console.log('    clips: [{ uid: "PASTE_THE_32_CHARACTER_STREAM_UID_HERE" }],');
    console.log("  },");
  }

  console.log(
    "\nThe token IS the password; the hash is not. Only the hash goes in git.\n",
  );
}

main();
