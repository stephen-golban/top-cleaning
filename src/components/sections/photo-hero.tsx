import type { ReactNode } from "react";
import type { ImageSlot } from "@/content";
import { Heading, Photo, type HeadingSize, type PhotoRatio } from "@/components/ui";
import { cn } from "@/lib/cn";

export type PhotoHeroProps = {
  slot: ImageSlot;
  alt: string;
  title: string;
  /** The sentence under the h1. Kept to ~42ch by the card itself. */
  description?: string;
  /**
   * A short label above the h1 — used on interior pages to say where you are.
   * Set in the accent, at 12.5px, so it reads as a location and not a heading.
   */
  eyebrow?: string;
  /** The action row. Anything else pushes the card past the photograph. */
  children?: ReactNode;
  ratio?: PhotoRatio;
  ratioMd?: PhotoRatio;
  ratioLg?: PhotoRatio;
  /** `display` for the home page, `title` for interior pages. */
  titleSize?: HeadingSize;
  /**
   * The hero is the one eager photograph on a page. Leave it on unless the
   * page has something above it.
   */
  priority?: boolean;
};

/**
 * Direction B's opening move: the photograph leads, and the words sit on it as
 * a calm white card.
 *
 * Below 760px there is no overlay — the card drops underneath the photograph on
 * white, separated by a hairline, because a 360px-wide card floating on a
 * 360px-wide photo is neither legible nor honest about the space it needs. From
 * 760px up it lifts off the image, bottom-left, on the one real shadow in the
 * system.
 *
 * The card is opaque white rather than a translucent scrim over the photo, so
 * the text contrast is a fixed 19.3:1 no matter which photograph a slot ends up
 * holding — including the client's own photos when they replace the
 * placeholders.
 */
export function PhotoHero({
  slot,
  alt,
  title,
  description,
  eyebrow,
  children,
  ratio = "4/5",
  ratioMd = "16/9",
  ratioLg = "2/1",
  titleSize = "display",
  priority = true,
}: PhotoHeroProps) {
  return (
    <section className="relative isolate">
      <Photo
        slot={slot}
        alt={alt}
        ratio={ratio}
        ratioMd={ratioMd}
        ratioLg={ratioLg}
        sizes="100vw"
        priority={priority}
      />

      <div
        className={cn(
          "relative border-t border-hairline bg-ground",
          "px-(--spacing-gutter) py-8",
          "min-[760px]:absolute min-[760px]:bottom-[clamp(24px,4vw,52px)] min-[760px]:left-[clamp(24px,4vw,52px)]",
          "min-[760px]:max-w-[min(600px,66vw)] min-[760px]:rounded-sm min-[760px]:border-t-0",
          "min-[760px]:p-[clamp(22px,3.4vw,40px)] min-[760px]:shadow-card",
        )}
      >
        {eyebrow ? (
          <p className="mb-3 text-fine font-semibold tracking-[0.08em] text-accent-strong uppercase">
            {eyebrow}
          </p>
        ) : null}

        <Heading level={1} size={titleSize}>
          {title}
        </Heading>

        {description ? (
          <p className="mt-3.5 max-w-[42ch] text-lead text-ink-3">{description}</p>
        ) : null}

        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
