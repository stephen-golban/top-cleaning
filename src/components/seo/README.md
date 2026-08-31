# `src/components/seo`

Structured data (JSON-LD). Standalone Server Components that emit a single
`<script type="application/ld+json">` and nothing else — no styling, no client
JavaScript, no layout impact.

Nothing here is wired into a page yet. These are the parts; a later pass mounts
them.

## What exists

| Component              | Renders                                            | Mount it                                    |
| ---------------------- | -------------------------------------------------- | ------------------------------------------- |
| `LocalBusinessJsonLd`  | `LocalBusiness` — who the company is               | Once, in `src/app/[locale]/layout.tsx`      |
| `WebSiteJsonLd`        | `WebSite` — names the site, points at the business | Once, in the same layout                    |
| `ServiceJsonLd`        | `Service` — one per service detail page            | `src/app/[locale]/services/[slug]/page.tsx` |
| `BreadcrumbListJsonLd` | `BreadcrumbList` — the visible trail               | Any page below the home page                |

Each also exports a `build…Node` function returning the plain object, for tests
or for merging nodes by hand.

## Intended wiring

```tsx
// src/app/[locale]/layout.tsx — inside <body>, anywhere.
const t = useTranslations();

<LocalBusinessJsonLd
  locale={locale}
  name={t("meta.siteName")}
  city={t("common.city")}
  description={t("meta.description")}
/>
<WebSiteJsonLd locale={locale} name={t("meta.siteName")} description={t("meta.description")} />
```

```tsx
// src/app/[locale]/services/[slug]/page.tsx
<ServiceJsonLd
  locale={locale}
  name={service.name[locale]}
  description={service.summary[locale]}
  url={routeCanonicalUrl(
    { pathname: "/services/[slug]", params: { slug: service.slug[locale] } },
    locale,
  )}
  city={t("common.city")}
  imageUrl={imageSlots[service.image].asset.src}
/>

<BreadcrumbListJsonLd
  items={[
    { name: t("nav.home"), url: localeHomeUrl(locale) },
    { name: t("nav.services"), url: routeCanonicalUrl("/services", locale) },
    { name: service.name[locale], url: canonical },
  ]}
/>
```

`ServiceJsonLd` names its provider by reference (`{"@id": …}`) instead of
restating the company on every page. **The reference only resolves if the
`LocalBusiness` node is on the same page**, which is why the layout is the right
place for it. Both ids live in `./ids.ts`.

URLs may be absolute or root-relative; the components normalise them against
`NEXT_PUBLIC_SITE_URL`. Copy is always passed in — these components never read
the message files, so every user-facing string stays in `messages/*.json` where
`pnpm check:i18n` can see it.

## Two decisions worth not re-litigating

**`@type` is `LocalBusiness`, not `CleaningService`.** `CleaningService` is not
a schema.org type — `LocalBusiness`'s subtypes are a fixed list and none of them
covers domestic cleaning. schema.org's own cleaning-company example uses plain
`LocalBusiness` and puts the category on the `Service` nodes as `serviceType`,
which is what `ServiceJsonLd` does. An invented `@type` is invalid structured
data and gets ignored.

**Only fields with real data behind them are emitted.** No `address`, no
`openingHours`, no `priceRange`, no `sameAs`, no `aggregateRating`, no `review`,
no `offers`. None of those facts exist for this business
(`.agents/DECISIONS.md`), and fabricated structured data is a manual-action
risk, not a small lie. The full table of what is omitted and why is in the
module comment at the top of `local-business.tsx`. If a fact becomes real, add
the field there — never at a call site.

`logo` now points at `/logo.png` by default — the brand lockup ships as a real
file a crawler can fetch. Pass `logoUrl` to override it, or `null` to drop the
field.
