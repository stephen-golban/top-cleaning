# `src/lib/seo`

Canonical URLs, hreflang clusters, page metadata, the sitemap's contents, and
the guard that keeps the private video route out of all of them.

Data and pure functions only. The rendered structured data lives in
`src/components/seo`.

| Module                | What it is for                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| `routes.ts`           | The public route table: every publishable page, with each locale's real path |
| `urls.ts`             | `canonicalUrl`, `hreflangAlternates`, `localeHomeUrl`, `toAbsoluteUrl`       |
| `metadata.ts`         | `pageMetadata` and its parts, for a page's `generateMetadata`                |
| `sitemap.ts`          | `buildSitemap` — what `src/app/sitemap.ts` renders                           |
| `private-routes.ts`   | `isPrivatePath` / `assertNoPrivateRoutes` — the `/v/` guard                  |
| `node-test-setup.mts` | Resolution shims so `pnpm test` can import all of the above                  |

## Using it from a page

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return pageMetadata({
    locale,
    paths: getLocalizedPathnames("/about"),
    title: t("about.title"),
    description: t("about.description"),
    siteName: t("siteName"),
  });
}
```

That returns `title`, `description`, `alternates` (canonical + all three
locales + `x-default` → ro), `openGraph` and `twitter`. It is a plain
`Metadata` object — spread it and override anything.

Service detail pages have locale-varying slugs, so `getLocalizedPathnames` (one
`href`, many locales) cannot express them. Take their `paths` from
`publicRoutes` instead:

```ts
const route = publicRoutes.find((r) => r.id === `service:${service.id}`)!;
```

Copy is never read here. Pass `t(…)` in; the strings stay in `messages/*.json`.

## Adding a page

Add it to `staticRoutes` in `routes.ts`. Everything downstream — the sitemap,
the hreflang cluster, the metadata helpers — follows from that one entry. Do not
hand-write entries in `src/app/sitemap.ts`: those bypass both the localized
pathname lookup and the private-route assertion.

## The `/v/` guard — do not remove it

`.agents/FOLLOWUPS.md`, HARD CONSTRAINTS:

> **`sitemap.ts` MUST NOT emit any `/v/` path.** There is no automatic guard.
> The private video route is excluded by convention only — breaking this
> publishes the client's private videos to search engines.

There is an automatic guard now, in two layers:

1. **Types.** `PublicPathname` subtracts `PRIVATE_PATHNAMES` from the app's
   route union, so putting `/v/[token]` in the route table is a compile error.
2. **Runtime.** `buildSitemap` returns through `assertNoPrivateRoutes`, which
   inspects every URL _and_ every hreflang alternate and throws. A hand-written
   string that dodges the types still cannot get out.

`isPrivatePath` is deliberately over-eager: it matches a bare `v` path segment
at any depth, so a future service slug of exactly `v` would trip it. That is the
right trade — a false positive is a build error someone reads, a false negative
is a private video in Google's index.

`src/app/robots.ts` derives its disallow list from the same
`PRIVATE_PATH_SEGMENTS` constant, so robots.txt and sitemap.xml cannot drift
apart about what "private" means.

`private-routes.test.mts` covers all of it, including running the real
`buildSitemap()` and asserting nothing in its output contains `/v/`. Run it with
`pnpm test`.

## Why the sitemap has no `lastModified`

The old site set it to `new Date()`, so every URL claimed to have changed today,
every day. A `lastmod` that is always now is worse than none — crawlers learn to
ignore it. The copy lives in git rather than a CMS and there is no build-time
per-page timestamp to use honestly, so the field is left out until there is a
real value for it.
