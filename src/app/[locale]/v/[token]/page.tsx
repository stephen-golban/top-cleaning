import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveVideoLink } from "@/lib/video/catalog";
import { buildSignedPlayback } from "@/lib/video/playback";
import { PrivateVideoPlayer } from "../_components/private-video-player";
import type { PlayerClip } from "../_components/private-video-player";

/**
 * `/[locale]/v/[token]` — the page a client reaches by scanning a QR code.
 *
 * Three things keep it private:
 *   1. the token is 192 bits of randomness, so it cannot be guessed;
 *   2. Cloudflare Stream is set to `requireSignedURLs`, so even the real video
 *      URL is useless without a JWT this server signs;
 *   3. those JWTs expire in hours, so a leaked page or copied URL rots quickly.
 *
 * Nothing on the public site links here, it is excluded from the sitemap,
 * disallowed in robots.txt, and marked `noindex` twice over (meta tag below and
 * the `X-Robots-Tag` header configured in `next.config.ts`).
 */

// Never prerender, never cache: the response is keyed on a secret and contains
// short-lived credentials.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Static rather than `generateMetadata` on purpose. A localised title would have
 * to come from the link's own data, which would put the video's subject into the
 * browser tab, the history entry and any share sheet. It stays generic.
 */
export const metadata: Metadata = {
  title: { absolute: "Top Cleaning" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
      nosnippet: true,
    },
  },
  alternates: {},
};

type PageParams = { locale: string; token: string };

export default async function PrivateVideoPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, token } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const link = await resolveVideoLink(safeDecode(token));
  // Unknown, malformed and revoked tokens are indistinguishable from here on.
  if (!link) notFound();

  const playback = await buildSignedPlayback(link, locale);
  // A misconfigured signing key must look identical to a bad token, or the 404
  // becomes an oracle telling an attacker which tokens are real.
  if (!playback) notFound();

  const t = await getTranslations({ locale, namespace: "video" });

  const clips: PlayerClip[] = playback.clips.map((clip, index) => ({
    key: clip.key,
    title: clip.title ?? t("clipNumber", { number: index + 1 }),
    iframeSrc: clip.iframeSrc,
    posterSrc: clip.posterSrc,
  }));

  return (
    <div className="mx-auto max-w-(--container-content) px-(--spacing-gutter) py-(--spacing-section)">
      <p className="flex items-center gap-2 text-fine font-medium tracking-[0.08em] text-ink-3 uppercase">
        <LockIcon />
        {t("badge")}
      </p>

      <h1 className="mt-4 font-serif text-title font-semibold text-ink">
        {playback.title ?? t("heading")}
      </h1>

      {playback.description ? (
        <p className="mt-3 max-w-(--container-prose) text-lead text-ink-2">
          {playback.description}
        </p>
      ) : null}

      <div className="mt-8 sm:mt-10">
        <PrivateVideoPlayer
          clips={clips}
          labels={{
            play: t("play"),
            playlistTitle: t("playlistTitle"),
            playerTitle: t("playerTitle"),
          }}
        />
      </div>

      <p className="mt-10 border-t border-hairline pt-6 text-ui text-ink-3">
        {t("privacyNote")}
      </p>
    </div>
  );
}

/** A malformed percent-escape is just another invalid token, not a crash. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 fill-none stroke-current stroke-[1.5]"
      aria-hidden
      focusable="false"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
