"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * The player for a private link.
 *
 * Deliberately lazy: nothing but a poster image loads until someone asks to
 * watch. The Cloudflare player is a few hundred kilobytes of JavaScript inside
 * an iframe; on the phone in a hallway that this page exists for, paying for it
 * up front is the difference between "it opened" and "it's still spinning".
 *
 * Every URL it receives is a short-lived signed URL minted on the server. No
 * video UID, account ID or key reaches this component.
 */

export type PlayerClip = {
  /** Stable React key. Position-based; never the video UID. */
  key: string;
  /** Already resolved and localised on the server. */
  title: string;
  iframeSrc: string;
  posterSrc: string;
};

export type PlayerLabels = {
  play: string;
  playlistTitle: string;
  playerTitle: string;
};

export function PrivateVideoPlayer({
  clips,
  labels,
}: {
  clips: PlayerClip[];
  labels: PlayerLabels;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const active = clips[activeIndex];
  if (!active) return null;

  function start(index: number) {
    setActiveIndex(index);
    setStarted(true);
  }

  return (
    <div>
      <div className="relative isolate aspect-video w-full overflow-hidden rounded-sm bg-ink shadow-md">
        {started ? (
          <StreamFrame
            frameRef={frameRef}
            // Remounting on clip change is intentional: it resets the player
            // rather than leaving the previous video's state behind.
            key={active.key}
            src={`${active.iframeSrc}&autoplay=true`}
            title={`${labels.playerTitle} — ${active.title}`}
          />
        ) : (
          <button
            type="button"
            onClick={() => start(activeIndex)}
            className="group absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center"
            aria-label={`${labels.play}: ${active.title}`}
          >
            <Poster src={active.posterSrc} />
            <span
              aria-hidden
              className="absolute inset-0 bg-ink/25 transition-colors duration-(--duration-base) group-hover:bg-ink/15"
            />
            <span
              aria-hidden
              className="relative flex size-16 items-center justify-center rounded-full bg-ground/95 shadow-menu ring-1 ring-ink/10 transition-transform duration-(--duration-base) ease-(--ease-out-soft) motion-safe:group-hover:scale-105 sm:size-20"
            >
              <PlayIcon />
            </span>
          </button>
        )}
      </div>

      {clips.length > 1 ? (
        <section className="mt-10">
          <h2 className="text-fine font-semibold tracking-[0.08em] text-ink-3 uppercase">
            {labels.playlistTitle}
          </h2>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {clips.map((clip, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={clip.key}>
                  <button
                    type="button"
                    onClick={() => start(index)}
                    aria-current={isActive ? "true" : undefined}
                    className="flex w-full cursor-pointer items-center gap-4 py-3 text-left transition-colors duration-(--duration-fast) hover:bg-surface"
                  >
                    <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xs bg-ink sm:w-28">
                      <Poster src={clip.posterSrc} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-ui text-ink ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {clip.title}
                      </span>
                      <span className="tnum mt-0.5 block text-fine text-ink-3">
                        {index + 1} / {clips.length}
                      </span>
                    </span>
                    {isActive ? (
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-accent"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Signed Stream thumbnails are one-off, short-lived URLs on Cloudflare's own
 * delivery host. Routing them through `next/image` would copy each private frame
 * into a shared, publicly addressable optimiser cache — exactly what this whole
 * feature exists to prevent. So: a plain `<img>`, on purpose.
 */
function Poster({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      decoding="async"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function StreamFrame({
  frameRef,
  src,
  title,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>;
  src: string;
  title: string;
}) {
  // Move keyboard focus into the player once it replaces the poster button, so
  // the tab order does not jump back to the top of the page.
  useEffect(() => {
    frameRef.current?.focus();
  }, [frameRef, src]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ml-0.5 size-6 fill-accent-strong sm:size-7"
      aria-hidden
      focusable="false"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
