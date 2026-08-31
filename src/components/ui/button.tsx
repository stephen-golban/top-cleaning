import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { AppLink, type AppLinkTarget } from "./link";

export type ButtonVariant = "solid" | "ghost" | "outline" | "quiet";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-sm font-medium " +
  "transition-colors duration-(--duration-base) ease-(--ease-standard) " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  /**
   * Direction B's `.btn`. The fill is `accent-strong` (#0062CC), never
   * `accent`: white on #007AFF is 4.0:1 and fails AA for a 15px label.
   */
  solid:
    "bg-accent-strong text-on-accent hover:bg-accent-stronger active:bg-accent-stronger",
  /** Direction B's `.ghost` — a text action on a hairline that darkens. */
  ghost:
    "rounded-none border-b border-hairline-strong px-0 pb-px text-ink hover:border-ink",
  /** The deck's `.menub` — a bordered, square affordance for icon-only actions. */
  outline:
    "border border-hairline-strong bg-transparent text-ink hover:border-ink-3 hover:bg-surface",
  /** Lowest-emphasis text action. */
  quiet: "text-ink-2 hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 py-2 text-ui",
  md: "min-h-11 px-[22px] py-3 text-[0.9375rem] tracking-[0.005em]",
  lg: "min-h-12 px-7 py-3.5 text-base tracking-[0.005em]",
  /**
   * Square, for a single icon. It is its own size rather than `sm` plus
   * override classes: `cn` only concatenates, so two competing padding
   * utilities would be resolved by Tailwind's own sort order, not by the order
   * they appear in the class attribute.
   */
  icon: "size-9 p-0",
};

/** Ghost and quiet carry no box, so the size map's padding does not apply. */
const UNPADDED: ReadonlySet<ButtonVariant> = new Set(["ghost", "quiet"]);

export function buttonClasses({
  variant = "solid",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  const sizing = UNPADDED.has(variant)
    ? size === "sm"
      ? "text-ui"
      : "text-[0.9375rem]"
    : size === "icon"
      ? SIZES.icon
      : SIZES[size];

  return cn(BASE, sizing, VARIANTS[variant], className);
}

export type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** A real `<button>`. Use it only for actions that are not navigation. */
export function Button({ variant, size, className, type, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      className={buttonClasses({ variant, size, className })}
    />
  );
}

export type ButtonLinkProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & AppLinkTarget;

/**
 * The navigation sibling of `Button`. Same visual contract, correct element —
 * a link that looks like a button is still a link, and must stay one for
 * middle-click, copy-link and screen-reader semantics.
 */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return (
    <AppLink
      {...(rest as AppLinkTarget)}
      variant="bare"
      className={buttonClasses({ variant, size, className })}
    />
  );
}
