import type { ComponentProps } from "react";
import { Link as IntlLink } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * The locale-aware href type. Derived from next-intl's typed `Link` rather than
 * re-declared, so the day `routing` gains a `pathnames` map every call site in
 * the app is re-checked by `tsc` instead of silently 404-ing.
 */
export type AppHref = ComponentProps<typeof IntlLink>["href"];

/** Anything the router must not handle: tel:, mailto:, viber:, http(s):. */
export type ExternalHref = string;

const EXTERNAL = /^(https?:|tel:|mailto:|viber:|sms:|geo:)/i;

export function isExternalHref(href: unknown): href is ExternalHref {
  return typeof href === "string" && EXTERNAL.test(href);
}

export type InternalLinkTarget = Omit<ComponentProps<typeof IntlLink>, "className">;
export type ExternalLinkTarget = Omit<ComponentProps<"a">, "className" | "href"> & {
  href: ExternalHref;
};

/**
 * Where a link points, without any of the styling props. Shared with
 * `ButtonLink` so both primitives accept exactly the same destinations.
 */
export type AppLinkTarget = InternalLinkTarget | ExternalLinkTarget;

export type LinkVariant = "bare" | "nav" | "quiet" | "inline" | "underline";

const VARIANTS: Record<LinkVariant, string> = {
  /** No colour, no decoration — for wordmarks, cards and image links. */
  bare: "",
  /** Header and footer navigation. */
  nav: "text-ui text-ink-2 transition-colors duration-(--duration-base) hover:text-ink",
  /** Contact rows and secondary lists. */
  quiet:
    "text-ui text-ink-2 transition-colors duration-(--duration-base) hover:text-accent-strong",
  /**
   * A link inside running prose. `accent-strong`, never `accent`: this is small
   * text and #007AFF is only 4.0:1 on white.
   */
  inline:
    "text-accent-strong underline decoration-accent-strong/40 transition-[text-decoration-color] duration-(--duration-base) hover:decoration-accent-strong",
  /** Direction B's `.ghost` — ink text on a hairline rule that darkens. */
  underline:
    "border-b border-hairline-strong pb-px text-[0.9375rem] font-medium text-ink transition-colors duration-(--duration-base) hover:border-ink",
};

export type AppLinkProps = {
  variant?: LinkVariant;
  className?: string;
} & AppLinkTarget;

/**
 * The single link primitive.
 *
 * Internal hrefs go through next-intl's typed `Link`, which adds the locale
 * prefix and the localized pathname. `tel:`, `mailto:`, `viber:` and absolute
 * URLs fall through to a plain `<a>`; only http(s) targets open in a new tab,
 * because sending a `tel:` to a new tab leaves a blank window behind.
 */
export function AppLink({ variant = "bare", className, ...rest }: AppLinkProps) {
  const classes = cn(
    "rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    VARIANTS[variant],
    className,
  );

  if (isExternalHref(rest.href)) {
    const anchorProps = rest as ExternalLinkTarget;
    const isHttp = /^https?:/i.test(anchorProps.href);

    return (
      <a
        {...anchorProps}
        className={classes}
        {...(isHttp ? { target: "_blank", rel: "noreferrer" } : {})}
      />
    );
  }

  return <IntlLink {...(rest as InternalLinkTarget)} className={classes} />;
}
