#!/usr/bin/env node
/**
 * Turn a private video token (or a full link) into a print-ready QR code.
 *
 *   pnpm video:qr <TOKEN>
 *   pnpm video:qr --token-file qr-codes/curatenie.txt
 *   pnpm video:qr https://topcleaning.md/ro/v/<TOKEN>
 *   pnpm video:qr <TOKEN> --locale ru --name curatenie-apartament
 *
 * `--token-file` reads the token out of a file written by
 * `pnpm video:token --out FILE`, so the secret never appears on a command line
 * and never reaches shell history or a session transcript.
 *
 * Writes an SVG (vector — use this for anything printed) and a large PNG
 * (for anyone who cannot place an SVG) into ./qr-codes, which is self-ignoring:
 * the files encode the secret link, so they must never reach git.
 *
 * Error correction is fixed at level H (~30% recoverable). A business card that
 * has lived in a wallet is a hostile scanning environment; H is what survives it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import QRCode from "qrcode";

const LOCALES = ["ro", "ru", "en"];
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;

const USAGE = `Usage: pnpm video:qr <token-or-url> [options]
       pnpm video:qr --token-file <file> [options]

Options:
  --token-file <f> Read the token from a file written by \`pnpm video:token --out\`
  --base <url>     Site base URL (default: $NEXT_PUBLIC_SITE_URL or https://topcleaning.md)
  --locale <code>  ro | ru | en (default: ro)
  --out <dir>      Output directory (default: ./qr-codes)
  --name <name>    Base filename (default: derived from the token)
  --size <px>      PNG width in pixels (default: 2048)`;

function parseArgs(argv) {
  const args = {
    base: process.env.NEXT_PUBLIC_SITE_URL ?? "https://topcleaning.md",
    locale: "ro",
    out: "qr-codes",
    size: 2048,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--token-file") args.tokenFile = argv[++i];
    else if (arg === "--base") args.base = argv[++i] ?? args.base;
    else if (arg === "--locale") args.locale = argv[++i] ?? args.locale;
    else if (arg === "--out") args.out = argv[++i] ?? args.out;
    else if (arg === "--name") args.name = argv[++i];
    else if (arg === "--size") args.size = Number.parseInt(argv[++i] ?? "", 10);
    else if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
    else positional.push(arg);
  }

  if (args.tokenFile) {
    if (positional.length > 0) {
      throw new Error("pass either a token or --token-file, not both");
    }
  } else if (positional.length !== 1) {
    throw new Error("expected exactly one token or URL, or --token-file <file>");
  }
  if (!LOCALES.includes(args.locale)) {
    throw new Error(`--locale must be one of ${LOCALES.join(", ")}`);
  }
  if (!Number.isInteger(args.size) || args.size < 256 || args.size > 8192) {
    throw new Error("--size must be between 256 and 8192");
  }

  args.input = positional[0];
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

/**
 * Pull the token out of a `pnpm video:token --out` file: the last `TOKEN=` line,
 * so a file that has accumulated several links yields the newest.
 */
async function readTokenFile(file) {
  let contents;
  try {
    contents = await readFile(path.resolve(process.cwd(), file), "utf8");
  } catch (error) {
    throw new Error(`could not read ${file}: ${error.message}`);
  }
  const matches = [...contents.matchAll(/^TOKEN=([A-Za-z0-9_-]{22,128})\s*$/gm)];
  const last = matches.at(-1);
  if (!last) {
    throw new Error(
      `${file} has no TOKEN= line. Generate one with: pnpm video:token --out ${file}`,
    );
  }
  if (matches.length > 1) {
    console.error(
      `Note: ${file} holds ${matches.length} tokens; using the last one written.`,
    );
  }
  return last[1];
}

/** Accept either a bare token or an already-built link. */
function resolveTarget(args) {
  if (/^https?:\/\//i.test(args.input)) {
    const url = new URL(args.input);
    const token = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return { url: url.toString(), token };
  }
  if (!TOKEN_PATTERN.test(args.input)) {
    throw new Error(
      "that does not look like a token (expected 22+ characters of A-Z a-z 0-9 _ -)",
    );
  }
  return {
    url: `${args.base}/${args.locale}/v/${args.input}`,
    token: args.input,
  };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    process.exit(1);
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }

  let target;
  try {
    if (args.tokenFile) args.input = await readTokenFile(args.tokenFile);
    target = resolveTarget(args);
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    process.exit(1);
  }

  // Derived from the token file when there is one, so no part of the secret
  // ends up in a filename that might be read aloud or pasted into an email.
  const name =
    args.name ??
    (args.tokenFile
      ? path.basename(args.tokenFile).replace(/\.[^.]+$/, "")
      : `video-${target.token.slice(0, 8)}`);
  const outDir = path.resolve(process.cwd(), args.out);
  await mkdir(outDir, { recursive: true });
  // Belt and braces: these files contain the secret link.
  await writeFile(
    path.join(outDir, ".gitignore"),
    "# QR codes encode secret video links. Never commit them.\n*\n",
    "utf8",
  );

  const options = {
    errorCorrectionLevel: "H",
    // 4 modules is the quiet zone the QR spec requires; anything less is what
    // makes printed codes fail to scan against a busy background.
    margin: 4,
    color: { dark: "#0B0E14", light: "#FFFFFF" },
  };

  const svgPath = path.join(outDir, `${name}.svg`);
  const pngPath = path.join(outDir, `${name}.png`);

  const svg = await QRCode.toString(target.url, { ...options, type: "svg" });
  await writeFile(svgPath, svg, "utf8");
  await QRCode.toFile(pngPath, target.url, {
    ...options,
    type: "png",
    width: args.size,
  });

  if (args.tokenFile) {
    // The whole point of --token-file is that the secret stays out of the
    // terminal. Print the shape of the link, not the link.
    console.log(
      `\nEncoded link:  ${args.base}/${args.locale}/v/<token from ${args.tokenFile}>`,
    );
  } else {
    console.log(`\nEncoded link:  ${target.url}`);
  }
  console.log(`SVG (print):   ${svgPath}`);
  console.log(`PNG (${args.size}px):   ${pngPath}`);
  console.log("\nError correction: H (~30%)  ·  Quiet zone: 4 modules");
  console.log("Scan it with your own phone before you print a hundred of them.");
  console.log("These files contain the secret link — do not email or upload them.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
