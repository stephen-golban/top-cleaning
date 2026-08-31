import type { VideoLink } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRIVATE VIDEO LINKS — this is the file you edit to add a video.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  To add a video, see `.agents/video-setup.md` for the full walkthrough. The
 *  short version:
 *
 *    1. Upload the video to Cloudflare Stream and lock it:
 *         pnpm video:lock <VIDEO_UID>
 *       (or tick "Require signed URLs" in the Stream dashboard).
 *
 *    2. Generate a secret token:
 *         pnpm video:token
 *
 *    3. Copy the block it prints into the array below.
 *
 *    4. Make the QR code:
 *         pnpm video:qr <TOKEN>
 *
 *  Rules that matter:
 *    • The token is the secret. Anyone who has it can watch the video, so treat
 *      the printed QR like a key. To revoke a link, delete its entry here and
 *      redeploy — the link dies immediately.
 *    • Never paste a token into an email subject, a public page, or a chat you
 *      would not want forwarded.
 *    • `uid` is the 32-character ID Cloudflare gives the video, not its filename.
 *
 *  Entries can also be supplied at runtime through the `PRIVATE_VIDEO_LINKS`
 *  environment variable (a JSON array of exactly these objects), which lets you
 *  add a link without a code change. See `.agents/video-setup.md`.
 */
export const videoLinks: VideoLink[] = [
  // Example — delete this and add your own. It is commented out so that an
  // unfinished entry can never accidentally become a live link.
  //
  // {
  //   token: "Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S",
  //   title: {
  //     ro: "Curățenie după reparație — metoda noastră",
  //     ru: "Уборка после ремонта — наш метод",
  //     en: "Post-renovation cleaning — our method",
  //   },
  //   clips: [{ uid: "ea95132c15732412d22c1476fa83f27a", posterTime: 3 }],
  // },
];
