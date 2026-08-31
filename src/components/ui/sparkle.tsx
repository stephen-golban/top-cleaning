import { cn } from "@/lib/cn";

export type SparkleProps = {
  /** Rendered height in px. Width follows the mark's 27:24 ratio. */
  size?: number;
  className?: string;
  /**
   * Accessible name. Omit it (the default) when the mark sits next to the
   * wordmark or any other text that already names the brand — a decorative
   * duplicate is noise for a screen reader.
   */
  title?: string;
};

const RATIO = 27 / 24;

/**
 * The Top Cleaning brand mark: a four-point sparkle with a smaller companion,
 * lifted verbatim from the approved deck (`.spark` in
 * `.agents/design-preview.html`).
 *
 * Colour comes from `currentColor`, so it inherits — set `text-accent` on it or
 * on a parent. `--color-accent` (#007AFF) is the correct blue here: this is an
 * icon, not text, and passes AA at 3:1.
 */
export function Sparkle({ size = 22, className, title }: SparkleProps) {
  const decorative = title === undefined;

  return (
    <svg
      width={Math.round(size * RATIO)}
      height={size}
      viewBox="0 0 27 24"
      fill="currentColor"
      className={cn("flex-none", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={title}
      focusable="false"
    >
      <path d="M9 3C9 7.95 13.05 12 18 12C13.05 12 9 16.05 9 21C9 16.05 4.95 12 0 12C4.95 12 9 7.95 9 3Z" />
      <path d="M23 2C23 3.925 24.575 5.5 26.5 5.5C24.575 5.5 23 7.075 23 9C23 7.075 21.425 5.5 19.5 5.5C21.425 5.5 23 3.925 23 2Z" />
    </svg>
  );
}
