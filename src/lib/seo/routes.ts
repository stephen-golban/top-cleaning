import { services } from "@/content/services";
import { getLocalizedPathnames, getPathname } from "@/i18n/navigation";
import { type AppPathname, type Locale, locales } from "@/i18n/routing";
import { type PrivatePathname } from "./private-routes";

/**
 * The public route table: every page that may appear in a sitemap, an hreflang
 * cluster or a crawler's view of the site, with each locale's real path.
 *
 * This is the single place that decides what "public" means. `PublicPathname`
 * subtracts `PRIVATE_PATHNAMES` from the app's route union at the *type* level,
 * so adding `/v/[token]` to the table below is a compile error, not a runtime
 * surprise. `assertNoPrivateRoutes` in `./private-routes.ts` is the second line
 * of defence for anything that slips past the types (a hand-built string, say).
 */

/** Every app route except the private ones. */
export type PublicPathname = Exclude<AppPathname, PrivatePathname>;

/** Public routes with no dynamic segment — these have one path per locale. */
export type StaticPublicPathname = Exclude<
  PublicPathname,
  `${string}[${string}]${string}`
>;

/** Mirrors `MetadataRoute.Sitemap[number]["changeFrequency"]` without importing Next. */
export type ChangeFrequency =
  "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export interface PublicRoute {
  /** Stable, locale-independent id. Handy in tests and error messages. */
  readonly id: string;
  /** The internal next-intl route this came from. */
  readonly pathname: PublicPathname;
  /** The public path for each locale, e.g. `{ ro: "/ro/servicii", … }`. */
  readonly paths: Readonly<Record<Locale, string>>;
  readonly changeFrequency: ChangeFrequency;
  readonly priority: number;
}

/**
 * Priorities are relative weights within this site, not absolute quality
 * scores: home first, then the commercial pages, then the pages a visitor
 * reaches after they already care.
 *
 * `changeFrequency` is honest rather than optimistic. This site has no CMS —
 * every word ships in a git commit — so nothing here changes daily and saying
 * so would only teach crawlers to distrust the file.
 */
const staticRoutes = [
  { id: "home", pathname: "/", changeFrequency: "monthly", priority: 1 },
  { id: "services", pathname: "/services", changeFrequency: "monthly", priority: 0.9 },
  { id: "contact", pathname: "/contact", changeFrequency: "yearly", priority: 0.7 },
  { id: "about", pathname: "/about", changeFrequency: "yearly", priority: 0.5 },
] as const satisfies readonly {
  id: string;
  pathname: StaticPublicPathname;
  changeFrequency: ChangeFrequency;
  priority: number;
}[];

/**
 * Localized paths for one service detail page.
 *
 * `getLocalizedPathnames` covers the static routes, but it takes a single
 * `href` and service slugs are localized too (`/ro/servicii/curatenie-generala`
 * vs `/ru/uslugi/generalnaya-uborka`), so the slug has to vary with the locale
 * as well as the container segment. Same mechanism, one level deeper.
 */
function serviceRoutePaths(
  slug: Readonly<Record<Locale, string>>,
): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      getPathname({
        href: { pathname: "/services/[slug]", params: { slug: slug[locale] } },
        locale,
      }),
    ]),
  ) as Record<Locale, string>;
}

/**
 * Every public route, in sitemap order. Computed once at module load — the
 * route table is static data derived from `pathnames` and `services`.
 */
export const publicRoutes: readonly PublicRoute[] = [
  ...staticRoutes.map((route): PublicRoute => ({
    id: route.id,
    pathname: route.pathname,
    paths: getLocalizedPathnames(route.pathname),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  })),
  ...services.map((service): PublicRoute => ({
    id: `service:${service.id}`,
    pathname: "/services/[slug]",
    paths: serviceRoutePaths(service.slug),
    changeFrequency: "monthly",
    priority: 0.8,
  })),
];
