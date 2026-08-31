#!/usr/bin/env node
/**
 * Turn a private video token (or a full link) into a print-ready QR code.
 *
 *   pnpm video:qr <TOKEN>
 *   pnpm video:qr https://topcleaning.md/ro/v/<TOKEN>
 *   pnpm video:qr <TOKEN> --locale ru --name curatenie-apartament
 *
 * Writes an SVG (vector — use this for anything printed) and a large PNG
 * (for anyone who cannot place an SVG) into ./qr-codes, which is self-ignoring:
 * the files encode the secret link, so they must never reach git.
 *
 * Error correction is fixed at level H (~30% recoverable). A business card that
 * has lived in a wallet is a hostile scanning environment; H is what survives it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import QRCode from "qrcode";

const LOCALES = ["ro", "ru", "en"];
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;

const USAGE = `Usage: pnpm video:qr <token-or-url> [options]

Options:
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
    if (arg === "--base") args.base = argv[++i] ?? args.base;
    else if (arg === "--locale") args.locale = argv[++i] ?? args.locale;
    else if (arg === "--out") args.out = argv[++i] ?? args.out;
    else if (arg === "--name") args.name = argv[++i];
    else if (arg === "--size") args.size = Number.parseInt(argv[++i] ?? "", 10);
    else if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
    else positional.push(arg);
  }

  if (positional.length !== 1) throw new Error("expected exactly one token or URL");
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
    target = resolveTarget(args);
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    process.exit(1);
  }

  const name = args.name ?? `video-${target.token.slice(0, 8)}`;
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

  console.log(`\nEncoded link:  ${target.url}`);
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
