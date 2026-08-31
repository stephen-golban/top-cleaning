/**
 * The guard that keeps the client's private videos out of search engines.
 *
 * `/v/<token>` is an unguessable, unlisted route: access is by printed QR code
 * or a link sent directly to one person. It is excluded from the sitemap, the
 * navigation and the footer *by convention* — no framework mechanism enforces
 * it. This module is that enforcement.
 *
 * `.agents/FOLLOWUPS.md` states the constraint in full:
 *
 * > **`sitemap.ts` MUST NOT emit any `/v/` path.** There is no automatic guard.
 * > The private video route is excluded by convention only — breaking this
 * > publishes the client's private videos to search engines.
 *
 * So: every list of public URLs this codebase produces runs through
 * `assertNoPrivateRoutes` before it leaves the process. If a future edit adds
 * `/v/[token]` to a route table — or adds a new private route and forgets to
 * exclude it — the build fails loudly instead of quietly publishing a private
 * link. A failed build is cheap; an indexed private video is not.
 *
 * Nothing here imports from the rest of the app on purpose: the guard has to be
 * runnable and testable in isolation (`private-routes.test.mts`).
 */

/**
 * Path segments that mark a route as private. A URL containing any of these as
 * a whole path segment must never be published.
 *
 * `v` is deliberately matched anywhere in the path rather than only at the
 * root, because the route is served both unprefixed (`/v/<token>`) and behind a
 * locale prefix (`/ro/v/<token>`), and a future nesting change should not
 * silently open a hole.
 */
export const PRIVATE_PATH_SEGMENTS: readonly string[] = ["v"];

/** Internal next-intl pathnames that must never be published. */
export const PRIVATE_PATHNAMES = ["/v/[token]"] as const;

export type PrivatePathname = (typeof PRIVATE_PATHNAMES)[number];

/**
 * The path part of an absolute URL or a root-relative path, with any query
 * string and fragment removed. Returns the input unchanged if it parses as
 * neither — the caller's guard should then still inspect it.
 */
function toPathname(urlOrPath: string): string {
  try {
    return new URL(urlOrPath).pathname;
  } catch {
    const cut = urlOrPath.search(/[?#]/);
    return cut === -1 ? urlOrPath : urlOrPath.slice(0, cut);
  }
}

/**
 * True when a URL or path contains a private segment.
 *
 * Deliberately conservative: it matches a bare `v` segment at any depth, so a
 * hypothetical future service slug of exactly `v` would trip it. That is the
 * right trade — a false positive is a build error someone reads, a false
 * negative is a private video in Google's index.
 */
export function isPrivatePath(urlOrPath: string): boolean {
  const segments = toPathname(urlOrPath).split("/").filter(Boolean);
  return segments.some((segment) => PRIVATE_PATH_SEGMENTS.includes(segment));
}

/** The shape `assertNoPrivateRoutes` inspects: a sitemap entry, near enough. */
export interface PublishedUrl {
  readonly url: string;
  readonly alternates?: {
    readonly languages?: Readonly<Record<string, string | undefined>>;
  };
}

/**
 * Throws if any entry — or any of its hreflang alternates — points at a private
 * route. Returns the entries unchanged so it can wrap a builder's return value.
 *
 * @param context Named in the error message, e.g. `"sitemap.xml"`.
 */
export function assertNoPrivateRoutes<T extends PublishedUrl>(
  entries: readonly T[],
  context: string,
): readonly T[] {
  const leaked: string[] = [];

  for (const entry of entries) {
    if (isPrivatePath(entry.url)) leaked.push(entry.url);
    for (const alternate of Object.values(entry.alternates?.languages ?? {})) {
      if (alternate && isPrivatePath(alternate)) leaked.push(alternate);
    }
  }

  if (leaked.length > 0) {
    throw new Error(
      `${context} would publish ${leaked.length} private URL(s): ${[...new Set(leaked)].join(", ")}. ` +
        "Private video routes must never be listed publicly — see src/lib/seo/private-routes.ts " +
        "and the HARD CONSTRAINTS section of .agents/FOLLOWUPS.md.",
    );
  }

  return entries;
}
