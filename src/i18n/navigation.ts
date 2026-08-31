import { createNavigation } from "next-intl/navigation";
import { type Locale, locales, routing } from "./routing";

export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);

/**
 * The typed `href` accepted by `Link`, `redirect` and `getPathname` — the union
 * of every route in `pathnames`, with its params where the route has any.
 */
export type Href = Parameters<typeof getPathname>[0]["href"];

/**
 * Every locale's public path for one route, keyed by locale.
 *
 * This is what `alternates.languages` and the sitemap want: pass an internal
 * href, get back `{ ro: "/ro/servicii", ru: "/ru/uslugi", en: "/en/services" }`.
 */
export function getLocalizedPathnames(href: Href): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, getPathname({ href, locale })]),
  ) as Record<Locale, string>;
}
