import type { AppHref } from "@/components/ui";

/** Keys into the `nav` message namespace. */
export type NavKey = "home" | "services" | "about" | "contact";

export type NavItem = {
  key: NavKey;
  href: AppHref;
};

/**
 * The header and footer navigation, in one place.
 *
 * These are the *internal* pathnames — the keys of the `pathnames` map in
 * `src/i18n/routing.ts`, not the URLs a visitor sees. next-intl swaps in the
 * localized path per locale, and `AppHref` is derived from that map, so a route
 * that stops existing fails `pnpm typecheck` here rather than 404-ing in
 * production. Nothing else in the shell hard-codes a route.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { key: "home", href: "/" },
  { key: "services", href: "/services" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export const HOME_HREF: AppHref = "/";
export const SERVICES_HREF: AppHref = "/services";
export const CONTACT_HREF: AppHref = "/contact";
