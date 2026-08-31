# QA report — integration pass before deploy

Run against commit `89fef5b`, on a production build (`pnpm build`) served by `next start`,
audited in Chrome for Testing 152 (headless), Lighthouse 13.4.1 mobile preset,
axe-core 4.13.0.

**Nothing was deployed.** No `wrangler deploy`, no `opennextjs-cloudflare deploy`. The
only wrangler command run was `wrangler deploy --dry-run`, which bundles and exits.

Every number below is a measurement. Where something falls short, it says so and says
why — see [What still falls short](#what-still-falls-short).

---

## Summary

| Area                           | Result                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Lighthouse Accessibility       | **100** on all 15 audited URLs                                |
| Lighthouse Best Practices      | **100** on all 15                                             |
| Lighthouse SEO                 | **100** on all 15                                             |
| Lighthouse Performance         | **87–96**, average 92 — not 100, [reason below](#1-performance-is-8796-not-100) |
| CLS                            | **0** everywhere                                              |
| TBT                            | **0–10 ms** everywhere                                        |
| axe-core violations            | **0** — 25 pages × 2 viewports, plus open-menu and form-error states |
| Horizontal overflow            | **0** — 25 pages × 6 widths                                   |
| Clipped/overflowing text       | **0** — 15 pages × 3 locales × 6 widths (was 4; fixed)        |
| Keyboard & focus behaviour     | **81/81** assertions pass                                     |
| JSON-LD                        | 81 nodes over 25 pages, all valid, 0 problems                 |
| Cloudflare Workers runtime     | Runs; server actions, routing and the private route all work  |

---

## Part 1 — Wiring that was missing

### JSON-LD was written but never rendered

Nothing mounted the components in `src/components/seo`, so no page shipped any structured
data at all. Now wired per that folder's README:

| Node             | Where                                              | Count |
| ---------------- | -------------------------------------------------- | ----- |
| `LocalBusiness`  | `src/app/[locale]/layout.tsx` — once per page       | 24    |
| `WebSite`        | same layout                                         | 24    |
| `Service`        | each service detail page                            | 12    |
| `BreadcrumbList` | every page below the locale home                    | 21    |

`LocalBusiness` and `WebSite` live in the layout rather than per page, because a `Service`
node names its provider by `{"@id": …}` reference and that reference only resolves if the
`LocalBusiness` node is on the same document.

**Validated structurally, not by a network validator** — the script is
`scratchpad/qa/validate-jsonld.mjs`, run over the built HTML in `.next/server/app`. It
asserts, on all 25 prerendered pages:

- every `ld+json` block parses as JSON, and no block contains a raw `</script`;
- `@context` is `https://schema.org` on every node;
- no member anywhere in the tree is `null` or `undefined`, no string is empty, and no
  string contains `undefined` / `[object Object]` / `NaN`;
- every URL is absolute, valid, and on `topcleaning.md` (or schema.org);
- **no fabricated field is emitted** — the script fails on `address`, `streetAddress`,
  `postalCode`, `openingHours`, `openingHoursSpecification`, `priceRange`, `sameAs`,
  `aggregateRating`, `review`, `geo`, `hasMap`, `legalName`, `vatID`, `taxID`,
  `foundingDate`, `offers`, `hasOfferCatalog`, `numberOfEmployees`, `founder`. None
  appear. This matters more than it sounds: fabricated structured data is a
  manual-action risk, and `.agents/DECISIONS.md` records that none of those facts exist;
- `telephone` is `+37379022023`, `email` is `info@topcleaning.md`, `logo` is
  `https://topcleaning.md/logo.png` — the three real facts, checked against the values
  in `src/content/contact.ts` rather than against themselves;
- exactly one `LocalBusiness` and one `WebSite` per page, never repeated;
- `WebSite.publisher` and `Service.provider` both point at `https://topcleaning.md/#business`,
  and that node is present on the same page;
- `BreadcrumbList` positions are `1..n` with exactly one item per path segment, and the
  home page carries none;
- `Service.url` equals that page's own `<link rel="canonical">`.

**Result: 0 problems.**

### The OpenGraph card was incomplete

While wiring the above, four tags turned out to be missing from every page: `og:url`,
`og:type`, `og:site_name`, `og:locale` (+ `og:locale:alternate`). `og:url` is the one
that matters here — WhatsApp, Viber and Telegram read it as the canonical identity of a
shared link, and this business's links are shared on exactly those three.

Adding them exposed a trap worth recording: **declaring `openGraph` on a page replaces
the root segment's `opengraph-image.png` file convention wholesale**, so the first attempt
silently deleted `og:image` and `twitter:image` from every page. The branded card is now
restated explicitly in `src/app/[locale]/_lib/metadata.ts` with a comment saying why.

`meta.ogImageAlt` is new in all three message files: the share card's alt text was a
single English sentence for all three languages.

### Icons and share image — all resolve

Checked as real HTTP requests against the running production server, not by looking at
the filesystem:

| Path                    | Status | Content-Type               |
| ----------------------- | ------ | -------------------------- |
| `/logo.png`             | 200    | `image/png`                |
| `/logo.svg`             | 200    | `image/svg+xml`            |
| `/favicon.ico`          | 200    | `image/vnd.microsoft.icon` |
| `/icon.svg`             | 200    | `image/svg+xml`            |
| `/apple-icon.png`       | 200    | `image/png`                |
| `/opengraph-image.png`  | 200    | `image/png` (1200×630)     |
| `/images/og.jpg`        | 200    | `image/jpeg`               |

Confirmed again over the Cloudflare Workers runtime (`pnpm preview`), where assets are
served by the `ASSETS` binding rather than by Node.

`og:image` and `twitter:image` resolve to `https://topcleaning.md/opengraph-image.png` on
every page — absolute, with `width`, `height`, `type` and localized `alt`.

---

## Part 2 — The quality bar, measured

### Lighthouse — mobile preset, production build

Emulated Moto G Power (412×823, DPR 1.75), simulated throttling, `onlyCategories` =
performance / accessibility / best-practices / seo. Raw reports in
`scratchpad/qa/lh-ship/`.

| URL | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP | SI |
| --- | ---: | ---: | -: | --: | --- | --- | --- | --- | --- |
| `/ro` | 94 | 100 | 100 | 100 | 3.2 s | 0 | 10 ms | 0.9 s | 0.9 s |
| `/ro/servicii` | 96 | 100 | 100 | 100 | 2.9 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/ro/servicii/curatenie-dupa-reparatie` | 93 | 100 | 100 | 100 | 3.2 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/ro/despre-noi` | 91 | 100 | 100 | 100 | 3.5 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/ro/contact` | 92 | 100 | 100 | 100 | 3.4 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/ru` | 87 | 100 | 100 | 100 | 4.0 s | 0 | 0 ms | 1.4 s | 1.4 s |
| `/ru/uslugi` | 91 | 100 | 100 | 100 | 3.5 s | 0 | 0 ms | 1.4 s | 1.4 s |
| `/ru/uslugi/uborka-posle-remonta` | 91 | 100 | 100 | 100 | 3.5 s | 0 | 0 ms | 1.4 s | 1.4 s |
| `/ru/o-nas` | 89 | 100 | 100 | 100 | 3.8 s | 0 | 0 ms | 1.4 s | 1.4 s |
| `/ru/kontakty` | 92 | 100 | 100 | 100 | 3.3 s | 0 | 0 ms | 1.4 s | 1.4 s |
| `/en` | 90 | 100 | 100 | 100 | 3.7 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/en/services` | 96 | 100 | 100 | 100 | 2.9 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/en/services/deep-cleaning` | 91 | 100 | 100 | 100 | 3.5 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/en/about` | 91 | 100 | 100 | 100 | 3.5 s | 0 | 0 ms | 0.9 s | 0.9 s |
| `/en/contact` | 96 | 100 | 100 | 100 | 2.9 s | 0 | 0 ms | 0.9 s | 0.9 s |

Accessibility, Best Practices and SEO are 100 across the board. CLS is a true zero — the
`Photo` component owns the aspect ratio and the image is absolutely positioned inside it,
so a call site cannot introduce a shift. TBT is effectively zero because the only client
component on a public page is the mobile menu.

Performance is **not** 100. What that costs and why is in
[What still falls short](#1-performance-is-8796-not-100).

#### What was fixed to get there

The starting point was **83** on `/ro`, LCP 4.7 s. Every fix below was measured
independently on a fresh build.

The whole story was fonts. Six preloaded woff2 files — **349 KB, all at High priority,
queued ahead of the LCP image** — pushed `lcpLoadDelay` to 1.4 s before the hero image
was even requested.

| Change | `/ro` | `/ru` |
| --- | ---: | ---: |
| Baseline (`opsz`, 3 subsets preloaded) | 83 | — |
| `preload: false` on both families | 84 | 85 |
| Serif not preloaded | 85 | 85 |
| Narrow `subsets` to `latin` + `latin-ext` | 87 | 82 |
| Drop Literata's `opsz` axis (3 subsets) | 90 | 87 |
| **Both: no `opsz`, `latin` + `latin-ext`** | **94** | **90** |
| Above + `experimental.inlineCss` | 88 | 88 |

Two things came out of that, both in `src/lib/fonts.ts`:

1. **`subsets` is a preload list, not a coverage list.** `next/font` emits an
   `@font-face` for *every* subset Google publishes — latin, latin-ext, greek,
   greek-ext, cyrillic, cyrillic-ext, vietnamese — each with its own `unicode-range`,
   regardless of what `subsets` says. `subsets` only decides which get a
   `<link rel="preload">`. Verified by reading the built CSS: with
   `subsets: ["latin", "latin-ext"]` the Cyrillic `@font-face` blocks are still there,
   and `/ru` still renders in real Commissioner and Literata — confirmed in the browser,
   not inferred. That takes 54 KB of never-drawn Cyrillic off every RO and EN page.

   The old `subsets` list doubled as a compile-time guarantee that both families still
   publish Cyrillic (the bug the old site shipped: the whole Russian site in fallback
   fonts). `CyrillicIsStillOnOffer` in `fonts.ts` now states that directly, and was
   checked to fail `pnpm typecheck` when it does not hold.

2. **Literata's `opsz` axis was dropped** — a design decision, taken on measured
   evidence, and reversible in one line. `.agents/FOLLOWUPS.md` chose Literata partly for
   its optical-size axis. Shipping that axis doubles every Literata file (latin
   51 → 108 KB, latin-ext 42 → 88 KB) and costs 7 Lighthouse points and roughly a second
   of LCP.

   The visual difference is real but small: with the axis, headings at 52px get finer
   hairlines and a slightly tighter fit; without it, the default text cut is sturdier and
   a little wider. Side-by-side renders are in `scratchpad/qa/shots-opsz/` and
   `scratchpad/qa/shots-noopsz/`. For a mobile-first local business site on Moldovan
   mobile networks, 100 KB per page beats an optical refinement — **but this is the
   client's call, not mine.** Add `axes: ["opsz"]` back to `serif` in `src/lib/fonts.ts`
   and the display cut returns at a cost of ~7 points.

`experimental.inlineCss` was tried and rejected: net-neutral on score, and it moves 11 KB
of CSS from a cacheable file into every HTML response.

### Accessibility — axe-core

`scratchpad/qa/audit.mjs`. axe-core 4.13.0, rule tags `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `wcag22aa`, `best-practice`. Twenty-five pages (all 8 page types × 3 locales,
plus the private-video 404), each scanned at 390px and 1440px — 50 runs.

**0 violations.**

That number is only worth anything if the tool actually works, so it was controlled:
axe reports 44 passing rules on a clean page, and when three known defects are injected
(an `<img>` with no alt, an empty `<button>`, `#ddd` text on white) it reports
`image-alt`, `button-name`, `color-contrast` and `region`. The harness detects real
violations.

Static scanning missed one, which is the point of the interaction pass below.

#### One violation found and fixed

**`landmark-unique`, all three locales, mobile menu open.** The header's own
`<nav aria-label="Navigare principală">` stays in the accessibility tree behind the modal
sheet, and the sheet's `<nav>` carried the identical label — two navigation landmarks with
the same accessible name, which is exactly the case that makes a landmark list useless to
navigate by. The sheet's nav now uses `nav.menu` ("Meniu" / "Меню" / "Menu").

#### Mobile menu — verified by driving it, per locale

`scratchpad/qa/interactive.mjs`. All pass in ro, ru and en:

- `aria-expanded` is `false` closed, `true` open, and back to `false` after Escape;
- `aria-controls` resolves to an element that exists once the sheet is open;
- the sheet is `role="dialog"` + `aria-modal="true"` with an accessible name;
- focus moves into the sheet on open, landing on the close button;
- **Tab is trapped** — 11 focus stops, 15 Tab presses, focus never leaves the sheet;
- **Shift+Tab is trapped** in the same way;
- Escape closes it;
- **focus returns to the trigger** — asserted as `document.activeElement === trigger`;
- the page behind is scroll-locked (`body { overflow: hidden }`) and unlocked on close;
- the scroll position is preserved across open/close;
- axe is clean with the sheet open (after the fix above).

#### Quote form — keyboard only, including the error state

All pass in ro, ru and en:

- the submit button is reachable from the top of the document with Tab alone (12 presses);
- submitting empty produces 2 `aria-invalid="true"` fields;
- **focus moves to the first invalid field**, not left on the button;
- every invalid field has an `aria-describedby` pointing at a non-empty message;
- an error summary is announced through a live region;
- **axe is clean in the error state**;
- the service `<select>` is focusable and labelled, with every option named in the page's
  language;
- filling the three fields and submitting clears every field error;
- the outcome panel takes focus;
- **an undeliverable submission offers the phone number and WhatsApp rather than a false
  success** — with no Resend credentials configured, `/ro/contact` returns "Cererea nu a
  putut fi trimisă. Încearcă din nou sau sună-ne la 079 022 023" and a `tel:` link. It
  never claims a message was sent that was not;
- axe is clean in the submitted state;
- the submit button shows a visible focus indicator (`outline: 2px solid`).

**81/81 assertions pass.**

> Worth knowing for anyone testing this by hand: the server action discards any
> submission that arrives within 2.5 s of the form mounting as automated, and answers it
> with the success panel. That is the anti-spam timing check working (`TIMING.minElapsedMs`
> in `src/components/forms/quote/fields.ts`), not a validation bug. Wait three seconds
> before submitting, or you will be testing the honeypot.

### Responsive — 360 / 390 / 768 / 1024 / 1440 / 2560, three locales

`scratchpad/qa/responsive.mjs` and `audit.mjs`. Screenshots in `scratchpad/qa/resp5/`.

|                                   | Combinations | Failures |
| --------------------------------- | -----------: | -------: |
| Page × width (5 page types × 3 locales × 6 widths) | 90 | 0 |
| Document-level horizontal overflow (25 pages × 6 widths) | 150 | 0 |
| Elements crossing the viewport edge | 150 | 0 |
| Text nodes wider than their own box | 90 | 0 |

**Document-level overflow is not a meaningful test on this site**, and it is worth saying
so: `body { overflow-x: clip }` in `globals.css` means the document can never report
horizontal overflow. It also means real overflow is silently *cut off* rather than shown.
So the real check is per-element: every heading, paragraph, link, button, list item, label
and form control was compared `scrollWidth` against `clientWidth`, and every element's
bounding box against the viewport.

#### The one thing that broke — and it was Russian, as predicted

`/ru`, the home hero, at **768, 1024, 1440 and 2560**: the h1 word
**"Профессиональные"** sets 505px at the display scale's 52px cap, inside a column that
was 460px wide. It ate the card's right padding and crossed its edge. `overflow-x: clip`
was hiding it from every document-level check.

Fixed by widening the hero card from `min(540px, 60vw)` to `min(600px, 66vw)`, which fits
the longest Russian word at every breakpoint with padding intact. Romanian and English
now set their h1 on two lines instead of three, so the page has the same shape in all
three languages.

**Two other fixes were tried and reverted, because both cost more than they bought** —
recorded so nobody re-derives them:

1. `hyphens: auto` on all headings turned the Romanian h1 into
   "Servicii profesio-nale de curățenie". `text-wrap: balance` treats a hyphenated break
   as just another candidate and takes it whenever the result is more even, so
   hyphenation is not a last resort next to it.
2. Scoping hyphenation to `:lang(ru)` and dropping `balance` there fixed the h1 but cost
   every other Russian heading its balanced wrap — "Что вы получаете, работая / с нами"
   instead of breaking at the comma.

`overflow-wrap: break-word` remains on `h1`–`h4` as a backstop. It does nothing now, and
it means the next long word is contained rather than clipped away invisibly.

Verified by pixel-diffing all 90 screenshots against the pre-fix set: the only changes are
the RU home hero at 768/1024/1440 and the three home heroes at 1024+ (the wider card).
Everything else is byte-identical, apart from two shots where a lazy image had not
finished loading.

### The private video route — unhappy path

Tested twice: under `pnpm dev` with a dummy `.env.local`, and against a production build
with the same dummy values in the environment. Real playback was **not** tested — that
needs real Cloudflare Stream credentials, and none exist. Nothing here is claimed about
playback.

The dummy setup registers one link with a well-formed token and a deliberately broken
signing key, so the two failure modes can be compared: a token that does not exist, and a
real token whose signing fails.

| Check | Result |
| --- | --- |
| Unknown token → HTTP status | 404 |
| Real token, broken signing key → HTTP status | 404 |
| `X-Robots-Tag` | `noindex, nofollow, noarchive, nosnippet` |
| `Cache-Control` | `private, no-store, max-age=0, must-revalidate` |
| `Referrer-Policy` | `no-referrer` |
| `<meta name="robots">` | `noindex` |
| Page renders the localized "link is no longer valid" copy | yes, with header and footer |
| Video uid in the HTML | no |
| Stream hostname (`cloudflarestream` / `videodelivery`) in the HTML | no |
| Signing key id or PEM in the HTML | no |
| Signed URL or JWT in the HTML | no |
| `<iframe>` in the HTML | no |
| **Unknown vs. real-but-broken token, same length: HTML byte-identical** | **yes — 60917 vs 60917 bytes** |
| Same, on the Cloudflare Workers runtime | **yes — 60443 vs 60443 bytes** |

The 404 is not an oracle: it cannot be used to discover which tokens are real. The server
log records `[video] cannot sign playback: CF_STREAM_SIGNING_KEY_PEM is malformed` — the
diagnosis stays server-side, and it does not print the key.

The token does appear in the RSC payload, because it is a path segment of the URL the
visitor already typed. That is not a leak.

**One caveat, dev-mode only.** Under `next dev`, Next forwards server `console.error`
output into the client payload for its error overlay, so the dev 404 for a real token
*does* contain `[video] cannot sign playback: CF_STREAM_SIGNING_KEY_PEM is malformed`
while the unknown-token 404 does not. That is a Next dev-server behaviour, it is absent
from both the production build and the Workers build (checked above, byte-identical), and
it matters only if someone exposes a `next dev` server to the internet — which nobody
should.

**The `/v/` guards still hold:** `sitemap.xml` contains no `/v/` path (checked on both
runtimes), `robots.txt` disallows `/v/`, `/ro/v/`, `/ru/v/`, `/en/v/` and `/*/v/`, and
nothing on the public site links to `/v/`. `pnpm test` includes the assertion that runs
the real `buildSitemap()` and fails if any URL or hreflang alternate contains `/v/`.

---

## Part 3 — Deployment readiness

### `pnpm preview` — the real Cloudflare runtime

`opennextjs-cloudflare build && opennextjs-cloudflare preview`, i.e. workerd, not Node.
This is where Node-builtin usage and runtime differences surface.

**It builds and runs.** Everything tested works:

| | |
| --- | --- |
| All 24 public pages, three locales | 200 |
| `/` → `/ro` | 307 |
| Legacy redirects (`/despre-noi`, `/servicii-de-curatenie/…`, `/ru/uslugi-po-uborke`) | 308, correct targets |
| `sitemap.xml`, `robots.txt` | 200, correct content, no `/v/` |
| `logo.png`, `favicon.ico`, `icon.svg`, `apple-icon.png`, `opengraph-image.png` | 200, correct MIME types |
| AVIF photography off the `ASSETS` binding | 200 `image/avif` |
| Canonical + `og:image` absolute on `topcleaning.md` | yes |
| **Quote form Server Action** (POST, `useActionState`) | works — returns the correct "could not be sent" panel with no delivery provider configured, and no client-side errors |
| Client-side navigation between all four pages (RSC fetches) | works, correct `h1` each time |
| Language switch `/ro/servicii` → `/ru/uslugi` | works, `<html lang>` becomes `ru-MD` |
| Private route 404 with dummy secrets from `.dev.vars` | 404, correct headers, byte-identical to the unknown-token 404 |
| Browser console / page errors during all of the above | none |

**Nothing broke.** No Node-builtin failure, no missing polyfill, no runtime difference
found. The `nodejs_compat` flag is doing its job — the video signing path uses Web Crypto,
and the quote delivery uses `fetch`.

Two differences from `next start`, both expected and neither a problem: `wrangler dev`
serves `Content-Encoding: identity` (no gzip locally — the real edge compresses), and
prerendered pages carry `Cache-Control: s-maxage=31536000`, which a deploy replaces.

### `wrangler.jsonc`

Correct as it stands for `topcleaning.md`. Validated with `wrangler deploy --dry-run`,
which reads the config, bundles the Worker and exits without publishing.

| Field | Value | Verdict |
| --- | --- | --- |
| `name` | `top-cleaning` | fine — the Worker name, not the domain |
| `main` | `.open-next/worker.js` | correct for `@opennextjs/cloudflare` 1.20.4 |
| `compatibility_date` | `2026-08-01` | past, and well beyond the 2024-09-23 minimum |
| `compatibility_flags` | `nodejs_compat`, `global_fetch_strictly_public` | both required; `global_fetch_strictly_public` is what stops a fetch to the site's own domain looping back into the Worker |
| `assets.directory` | `.open-next/assets` | correct — 161 files read on dry run |
| `assets.binding` | `ASSETS` | correct |
| `observability.enabled` | `true` | keeps `wrangler tail` and the dashboard logs useful |

Bundle size on dry run: **5216 KiB, 1086 KiB gzipped** — inside the 3 MB gzip free-tier
limit with room to spare.

No routes and no custom domain were added. That is the user's call, and
`.agents/DEPLOY.md` step 7 walks through attaching them in the dashboard, which keeps the
DNS record, the certificate and the route as one thing Cloudflare manages.

### `.agents/DEPLOY.md`

Written, for a non-developer. Ordered steps from "check you are logged in" through health
checks, `NEXT_PUBLIC_SITE_URL`, each `wrangler secret put`, the DNS/zone check, the
deploy, attaching `topcleaning.md` and `www`, a `www` → apex redirect rule, a smoke
checklist, redeploying, and rollback. No secret is ever asked for in a chat, an email or
a file — every one goes through a `wrangler secret put` prompt.

Two claims in it were verified rather than assumed: `.env.production` is picked up by
`next build` (the build prints `Environments: .env.production`, and the resulting
canonical is `https://topcleaning.md/ro`), and `wrangler rollback` exists in wrangler
4.127.1.

---

## What still falls short

### 1. Performance is 87–96, not 100

The whole gap is LCP: 2.9–4.0 s simulated, against Lighthouse's 2.5 s threshold for a
green metric. Every other scored metric is already perfect — FCP 0.9 s (1.4 s on `/ru`),
CLS 0, TBT ≤ 10 ms.

**Cause: two webfonts.** `/ro` and `/en` load 160 KB of font in 4 preloaded files; `/ru`
loads 214 KB in 6. They are `<link rel="preload">`ed at High priority and sit ahead of
the hero image in the queue, so `lcpLoadDelay` is ~1.9 s before the image is requested at
all. Observed (unthrottled) LCP is 81 ms; the 3.2 s figure is Lighthouse's model of a
1.6 Mbps / 150 ms-RTT connection.

**`/ru` is the worst page (87) for a specific, fixable-in-principle reason:** it loads
`latin` **and** `latin-ext` (preloaded, 160 KB — of which latin-ext, 72 KB, is never
drawn on a Russian page) **plus** Cyrillic on demand (54 KB). `next/font`'s preload list
is fixed at import time and the layout is shared across locales, so there is no way to
preload per locale without hand-rolling the `@font-face` rules. Not attempted here — it
would mean giving up `next/font`'s build-time self-hosting and its metric-matched
fallbacks, on the last pass before a deploy.

**What would actually close the gap**, in order of return:

1. Self-host a **subsetted** Literata via `next/font/local` — the site draws a known,
   small character set in the display face. Realistically 94 KB → ~25 KB for RO. Needs a
   subsetting step in the build and a guard so new copy cannot introduce a missing glyph.
2. Drop the display serif on mobile and set headings in Commissioner below some width.
   A design decision, not an engineering one.
3. Restore per-locale font preloads by hand-writing the `@font-face` blocks.

Anything short of reducing font bytes does not move it: `preload: false`, preloading only
the serif, and `experimental.inlineCss` were all measured, and all landed within a few
points of each other.

### 2. Three Lighthouse diagnostics remain, on all 15 URLs

None of these are scored — they do not cost a single point — but they are real:

- **`image-delivery-insight`, ~113 KiB.** The service-card photographs are served at
  828w into a 370 CSS-px box. At DPR 1.75 that needs 648 device px, and 828 is the next
  step up in the `srcSet`, so the browser is choosing correctly given a `sizes` of
  `100vw`; the card is actually ~90% of the viewport once gutters are subtracted. A more
  accurate `sizes` would let some viewports pick the 640w file instead. Left alone
  because guessing `sizes` wrong is more expensive than the ~26 KB it saves per image,
  and the below-fold images are Low priority and off the LCP path.
- **`legacy-javascript-insight`, ~12 KiB.** Transforms for `Array.prototype.at`,
  `Object.hasOwn`, `String.prototype.trimStart` and friends inside Next's own framework
  chunk. Not this project's code, and not removable without a Next-level browserslist
  change.
- **`render-blocking-insight`, ~110 ms.** The 11 KB stylesheet.
  `experimental.inlineCss` removes it and was measured as net-neutral, so it was not
  taken.

### 3. Literata ships without its optical-size axis

A deliberate, measured trade — 7 Lighthouse points and ~100 KB against a small
refinement in the display cut at 46px+. It is a design decision made on engineering
evidence, and the client may reasonably want the other answer. One line in
`src/lib/fonts.ts` reverses it; the module comment and
[the table above](#what-was-fixed-to-get-there) carry the numbers, and side-by-side
renders are in `scratchpad/qa/shots-opsz/` vs `scratchpad/qa/shots-noopsz/`.

### 4. The catch-all 404 is unstyled, and its `og:image` says `localhost`

Next generates an implicit `/_not-found` route that sits outside `src/app/[locale]/`, so
it never gets the locale layout's `metadataBase`. Its `og:image` is baked as
`http://localhost:3000/opengraph-image.png`, and the page itself is Next's bare default
rather than the branded 404.

**How reachable is it?** The middleware matcher excludes `api`, `_next`, `_vercel` and
*any path containing a dot*. So `/ro/nonexistent` and `/nonexistent` both get the proper
branded, localized 404 — but `/wp-login.php`, `/oferta.html` or `/api/anything` get the
bare one. In practice that is bot scans, plus the occasional mistyped legacy URL with an
extension.

Not fixed here. Broadening the middleware matcher to cover dotted paths means
hand-maintaining an allowlist for `robots.txt`, `sitemap.xml`, `favicon.ico`,
`logo.png`, `icon.svg`, `apple-icon.png`, `opengraph-image.png` and everything under
`/images/` — and getting that list wrong 404s the sitemap. That is not a change to make
on the last pass before a deploy. `app/global-not-found.tsx` (Next 15, experimental) is
the proper fix when it stabilises.

### 5. The quote form cannot deliver anything yet

By design, and it behaves correctly: with no `RESEND_API_KEY` / `QUOTE_NOTIFY_EMAIL` it
shows "could not be sent, here is our phone number", writes the full submission to the
server log prefixed `[quote] UNDELIVERED`, and never shows a false success. But **until
those two secrets are set (DEPLOY.md step 4a), no quote request reaches anyone by email.**
This is the single most important item on the post-deploy smoke checklist.

### 6. Not tested, and honestly cannot be here

- **Real video playback.** Needs Cloudflare Stream credentials, a signing key and an
  uploaded video. Only the unhappy path was verified. `.agents/video-setup.md` is the
  runbook.
- **Real email delivery.** Needs a Resend key.
- **The live domain, DNS, TLS.** `topcleaning.md` did not resolve during this work.
- **Real browsers other than Chromium.** Everything here is Chrome for Testing 152.
  Safari and Firefox behaviour — particularly `text-wrap: balance` and `hyphens` — is
  untested. Neither is load-bearing after the hero fix.
- **Screen readers.** ARIA, focus order, focus return, live regions and landmark
  uniqueness were verified programmatically. Nobody listened to it with VoiceOver, NVDA
  or JAWS.

### 7. Still true from earlier waves

- The photographs are **Unsplash placeholders**, to be swapped for the team's own photos
  (`.agents/assets.md`). Slots are referenced by id, so the swap does not touch any
  consumer.
- There are no testimonials, client counts, years in business, certifications or prices
  anywhere on the site or in its structured data, because none exist
  (`.agents/DECISIONS.md`).

---

## Final check state

```
pnpm lint        clean
pnpm typecheck   clean
pnpm check:i18n  ru.json and en.json each match ro.json, 132 keys
pnpm test        69 tests, 69 pass
pnpm build       32 routes prerendered
```

## How to re-run any of this

The audit scripts are in the session scratchpad, not the repo — they are one-off
instruments, not something the project should carry.

```bash
# terminal 1
pnpm build && pnpm start -p 4400

# terminal 2 — from the scratchpad directory
export CHROME_PATH="$HOME/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
node qa/lh.mjs /ro /ru /en                 # Lighthouse, mobile
node qa/audit.mjs                          # axe + overflow, 25 pages × 6 widths
node qa/interactive.mjs                    # mobile menu + quote form, keyboard
node qa/responsive.mjs                     # screenshots + per-element overflow
node qa/validate-jsonld.mjs <repo-root>    # structured data, from the built HTML
node qa/axe-control.mjs                    # proves the axe harness detects defects
```
