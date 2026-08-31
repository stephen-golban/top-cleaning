import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Heading, Lead } from "./heading";

export type ContainerWidth = "prose" | "content" | "wide";
type BlockTag = "div" | "section" | "header" | "footer" | "nav" | "article" | "aside";

const WIDTHS: Record<ContainerWidth, string> = {
  prose: "max-w-(--container-prose)",
  content: "max-w-(--container-content)",
  wide: "max-w-(--container-wide)",
};

export type ContainerProps = Omit<ComponentProps<"div">, "className"> & {
  width?: ContainerWidth;
  as?: BlockTag;
  className?: string;
};

/**
 * Direction B's horizontal rhythm: one max width, one fluid gutter
 * (20px at 360, 56px at 2560). Everything that is not a full-bleed photograph
 * sits inside one of these.
 */
export function Container({
  width = "wide",
  as = "div",
  className,
  ...rest
}: ContainerProps) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      className={cn("mx-auto w-full px-(--spacing-gutter)", WIDTHS[width], className)}
    />
  );
}

export type SectionTone = "ground" | "surface";
export type SectionSize = "sm" | "md" | "lg";

const TONES: Record<SectionTone, string> = {
  ground: "bg-ground",
  surface: "bg-surface",
};

const SECTION_PADDING: Record<SectionSize, string> = {
  sm: "py-(--spacing-sechead)",
  md: "py-(--spacing-section)",
  lg: "py-(--spacing-section-lg)",
};

export type SectionProps = Omit<ComponentProps<"section">, "className"> & {
  size?: SectionSize;
  tone?: SectionTone;
  /**
   * Wrap children in a `Container`. Pass `false` for a full-bleed section that
   * manages its own containers (a photographic band, for instance).
   */
  container?: ContainerWidth | false;
  className?: string;
};

/** Direction B's vertical rhythm: 40px at 360, 84px at desktop. */
export function Section({
  size = "md",
  tone = "ground",
  container = "wide",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section {...rest} className={cn(SECTION_PADDING[size], TONES[tone], className)}>
      {container === false ? (
        children
      ) : (
        <Container width={container}>{children}</Container>
      )}
    </section>
  );
}

export type SectionHeaderProps = {
  /** Rendered as an `h2` by default — pages own their single `h1`. */
  title: React.ReactNode;
  lead?: React.ReactNode;
  level?: 2 | 3;
  id?: string;
  className?: string;
};

/**
 * Heading plus optional lead, with the deck's 10px gap and the section's
 * bottom margin. More space above a heading than below it comes from `Section`.
 */
export function SectionHeader({
  title,
  lead,
  level = 2,
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-(--spacing-sechead) grid gap-2.5", className)}>
      <Heading level={level} size={level === 2 ? "title" : "subtitle"} id={id}>
        {title}
      </Heading>
      {lead ? <Lead>{lead}</Lead> : null}
    </div>
  );
}

export type DividerProps = { className?: string };

/**
 * A hairline rule. Direction A's discipline, borrowed on purpose: a rule
 * instead of a card border wherever a divider will do.
 */
export function Divider({ className }: DividerProps) {
  return <hr className={cn("h-px border-0 bg-hairline", className)} />;
}

export type BandProps = {
  /** The photograph. Full-height on the left at ≥820px, on top below that. */
  media: React.ReactNode;
  children: React.ReactNode;
  /** Put the photograph on the right instead. */
  reverse?: boolean;
  className?: string;
};

/**
 * Direction B's `.band`: a surface-toned, full-bleed two-up of photograph and
 * text. The text column is the wider of the two (1 : 1.1), matching the deck.
 */
export function Band({ media, children, reverse = false, className }: BandProps) {
  return (
    <section
      className={cn(
        "grid bg-surface min-[820px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        className,
      )}
    >
      <div className={cn("min-[820px]:h-full", reverse && "min-[820px]:order-2")}>
        {media}
      </div>
      <div className={cn("p-(--spacing-band)", reverse && "min-[820px]:order-1")}>
        {children}
      </div>
    </section>
  );
}
