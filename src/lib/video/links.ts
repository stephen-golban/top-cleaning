import type { VideoLink } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRIVATE VIDEO LINKS — this is the file you edit to add a video.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  !! THIS FILE IS PUBLIC. It is committed to
 *  <https://github.com/stephen-golban/top-cleaning>, which anyone can read.
 *  So it stores `tokenHash` — the SHA-256 of the secret link — and never the
 *  link itself. A hash is enough for the site to recognise a visitor's token
 *  and useless to anyone who wants to make one up. An entry that ships a
 *  plaintext `token` is refused at load time (see `catalog.ts`), which turns
 *  that mistake into a dead link rather than a published password.
 *
 *  To add a video, see `.agents/video-setup.md` for the full walkthrough. The
 *  short version:
 *
 *    1. Upload the video to Cloudflare Stream and lock it:
 *         pnpm video:stream upload ~/Downloads/clip.mov
 *         pnpm video:stream lock <VIDEO_UID>
 *       (or tick "Require signed URLs" in the Stream dashboard).
 *
 *    2. Generate a secret token and its hash:
 *         pnpm video:token --out qr-codes/my-link.txt
 *
 *    3. Copy the `tokenHash` block it prints into the array below.
 *
 *    4. Make the QR code, which needs the token itself:
 *         pnpm video:qr --token-file qr-codes/my-link.txt
 *
 *  Rules that matter:
 *    • The token is the secret. Anyone who has it can watch the video, so treat
 *      the printed QR like a key. Keep the token in your password manager and
 *      in `qr-codes/` (gitignored) — never here. To revoke a link, delete its
 *      entry below and redeploy: the link dies immediately.
 *    • Never paste a token into an email subject, a public page, or a chat you
 *      would not want forwarded.
 *    • `uid` is the 32-character ID Cloudflare gives the video, not its filename.
 *
 *  Entries can also be supplied at runtime through the `PRIVATE_VIDEO_LINKS`
 *  environment variable (a JSON array of exactly these objects), which lets you
 *  add a link without a code change. That variable is a Worker secret, so an
 *  entry there may use `token` in plaintext as well as `tokenHash`.
 *  See `.agents/video-setup.md`.
 */
export const videoLinks: VideoLink[] = [
  // Example — delete this and add your own. It is commented out so that an
  // unfinished entry can never accidentally become a live link.
  //
  // {
  //   tokenHash: "n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg",
  //   title: {
  //     ro: "Curățenie după reparație — metoda noastră",
  //     ru: "Уборка после ремонта — наш метод",
  //     en: "Post-renovation cleaning — our method",
  //   },
  //   clips: [{ uid: "ea95132c15732412d22c1476fa83f27a", posterTime: 3 }],
  // },
];
