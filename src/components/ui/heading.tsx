import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeadingSize = "display" | "title" | "subtitle" | "item" | "label";
export type HeadingFace = "serif" | "sans";

const TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;

/**
 * Direction B's type scale. The fluid clamps live in `@theme`; nothing here
 * hand-rolls one. `text-wrap: balance` is applied globally to h1–h4 in the base
 * layer, so headings break sensibly without a per-call-site utility.
 */
const SIZES: Record<HeadingSize, string> = {
  /** Hero h1 — 30 → 52px. */
  display: "text-display",
  /** Section h2 — 24 → 36px. */
  title: "text-title",
  /** Band h2 and secondary sections — 22 → 28px. */
  subtitle: "text-subtitle",
  /** Card / service h3 — 19 → 23px. */
  item: "text-item",
  /** The small bold h3 inside the numbered steps list — sans, not serif. */
  label: "text-[0.9375rem] leading-tight tracking-[-0.005em]",
};

/** Serif headings sit at 400, except the card title which needs 500 to hold. */
const DEFAULT_WEIGHT: Record<HeadingSize, string> = {
  display: "font-normal",
  title: "font-normal",
  subtitle: "font-normal",
  item: "font-medium",
  label: "font-bold",
};

const SIZE_FOR_LEVEL: Record<HeadingLevel, HeadingSize> = {
  1: "display",
  2: "title",
  3: "item",
  4: "label",
};

export type HeadingProps = Omit<ComponentProps<"h2">, "className"> & {
  level: HeadingLevel;
  /** Defaults to the natural size for the level. */
  size?: HeadingSize;
  /** Direction B sets headings in the serif; `label` is the sans exception. */
  face?: HeadingFace;
  className?: string;
};

export function Heading({ level, size, face, className, ...rest }: HeadingProps) {
  const Tag = TAGS[level];
  const resolvedSize = size ?? SIZE_FOR_LEVEL[level];
  const resolvedFace: HeadingFace =
    face ?? (resolvedSize === "label" ? "sans" : "serif");

  return (
    <Tag
      {...rest}
      className={cn(
        resolvedFace === "serif"
          ? "font-serif [font-optical-sizing:auto]"
          : "font-sans",
        SIZES[resolvedSize],
        DEFAULT_WEIGHT[resolvedSize],
        "text-ink",
        className,
      )}
    />
  );
}

export type LeadProps = Omit<ComponentProps<"p">, "className"> & { className?: string };

/**
 * The paragraph directly under a heading: hero sub-copy and section leads.
 * Muted, and held to a short measure so it stays a caption rather than a body.
 */
export function Lead({ className, ...rest }: LeadProps) {
  return <p {...rest} className={cn("max-w-[52ch] text-lead text-ink-3", className)} />;
}

/** Running body copy. Darker and longer-measured than `Lead`. */
export function Body({ className, ...rest }: LeadProps) {
  return <p {...rest} className={cn("max-w-[68ch] text-body text-ink-2", className)} />;
}

export type ProseProps = Omit<ComponentProps<"div">, "className"> & {
  className?: string;
};

/**
 * Long-form content whose markup we do not control (a service description, an
 * about page). Measure is held at ~68ch and vertical rhythm is set once here so
 * pages do not restyle paragraphs individually.
 */
export function Prose({ className, ...rest }: ProseProps) {
  return (
    <div
      {...rest}
      className={cn(
        "max-w-[68ch] text-body text-ink-2",
        "[&_p]:mt-4 [&_p:first-child]:mt-0",
        "[&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-subtitle [&_h2]:font-normal [&_h2]:text-ink",
        "[&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-item [&_h3]:font-medium [&_h3]:text-ink",
        "[&_ol]:mt-4 [&_ol]:grid [&_ol]:gap-2 [&_ul]:mt-4 [&_ul]:grid [&_ul]:gap-2",
        "[&_li]:relative [&_li]:pl-5",
        "[&_ul>li]:before:absolute [&_ul>li]:before:top-[0.66em] [&_ul>li]:before:left-0 [&_ul>li]:before:h-px [&_ul>li]:before:w-[7px] [&_ul>li]:before:bg-accent",
        "[&_a]:text-accent-strong [&_a]:underline [&_a]:decoration-accent-strong/40 [&_a:hover]:decoration-accent-strong",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        className,
      )}
    />
  );
}
