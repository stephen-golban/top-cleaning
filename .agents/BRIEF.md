# Top Cleaning — Project Brief (source of truth for all agents)

READ THIS FIRST. Also read `.agents/source-inventory.md` (content extracted from the
original repo https://github.com/VadimR7/topcleaning_next_app) before writing any copy.

## What we're building
A complete from-scratch rewrite of the Top Cleaning company website. The original repo
above is the SOURCE OF TRUTH for content (services, copy, contact details, brand). We are
NOT reusing its code — only its content and requirements.

## Locked decisions (do not revisit)
- **Framework**: Next.js 15 (App Router) + TypeScript strict + React 19.
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` config, no tailwind.config.js).
- **i18n**: `next-intl` with locale-prefixed routes. Locales: `ro` (default), `ru`, `en`.
  Every user-facing string lives in `messages/{locale}.json`. No hardcoded copy in JSX.
- **Hosting**: Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext). Domain already
  on Cloudflare.
- **Private video**: Cloudflare Stream. Videos are NEVER publicly listed or embeddable.
  Access only via a secret QR/link route that mints short-lived signed playback tokens
  server-side. See "Video gating" below.
- **Package manager**: pnpm.
- **Node**: 22.

## Palette (client-specified, non-negotiable)
- Background: white / near-white.
- Text: dark (near-black), high contrast.
- Accent: Apple system blue — `#007AFF` light mode. (Dark-mode counterpart `#0A84FF` if a
  dark theme is added; light is the primary and default experience.)
- Everything else is neutral greys. No second accent hue. Use the accent sparingly —
  CTAs, links, focus rings, small emphasis — not as large fills everywhere.

## Design bar
Use the `impeccable` skill (https://impeccable.style/tutorials/getting-started/) for all
UI work. The site must NOT look like a generic AI landing page: no purple gradients, no
emoji bullets, no "Trusted by 10,000+ companies" filler, no glassmorphism-by-default.
It is a real local cleaning business — the design should feel calm, clean, credible,
fast, and Apple-adjacent in restraint. Real content only; never invent testimonials,
client logos, certifications, awards, or statistics that are not in the source inventory.

## Non-negotiable quality bars
- **SEO**: per-page metadata, correct `hreflang` alternates for all 3 locales +
  `x-default`, canonical URLs, `sitemap.ts`, `robots.ts`, OpenGraph + Twitter cards,
  JSON-LD (`LocalBusiness`/`CleaningService`, `Service`, `BreadcrumbList`, `FAQPage`
  where applicable). Semantic HTML, one `h1` per page, descriptive alt text per locale.
- **Performance**: target Lighthouse 100/100/100/100 on mobile. `next/image` everywhere
  with explicit sizes; `next/font` self-hosted, no render-blocking webfonts; zero CLS;
  minimal client JS — Server Components by default, `"use client"` only where truly
  needed. Video is lazy — poster image first, player loads on interaction.
- **Accessibility**: WCAG 2.2 AA. Keyboard-navigable, visible focus rings, correct
  landmarks, labelled form fields, `prefers-reduced-motion` respected.
- **Responsive**: 360px → 2560px, no horizontal scroll at any width.

## Video gating (the QR-code feature)
The owner films work-strategy videos for clients. Requirements:
- Videos must be unreachable by search engines, scrapers, or by guessing.
- A client scans a QR code (or opens a link) and lands on a video page.
- Implementation: videos uploaded to Cloudflare Stream with `requireSignedURLs: true`.
  A route like `/[locale]/v/[token]` resolves a secret, unguessable token to a video (or
  a playlist of videos), and the server mints a short-lived signed playback JWT.
  The page is `noindex, nofollow`, excluded from the sitemap, and blocked in robots.txt.
- Include an admin-less way for the owner to add videos (config file or env-driven
  mapping is acceptable for v1) plus a QR-code generation script.

## Imagery
Use Unsplash (or similar free-license sources) for placeholder photography of clean
interiors, cleaning work, teams. Record every image's source URL and license in
`.agents/assets.md` so real photos can be swapped in later. Prefer few, large, good
photos over many small stock-y ones.

## Repo conventions
- Source in `src/`. Path alias `@/*` → `src/*`.
- `src/app/[locale]/...` routes, `src/components/...`, `src/lib/...`,
  `src/content/...` (typed structured data: services, FAQ, contact).
- ESLint + Prettier + TypeScript strict all clean before any task is called done.
- Conventional commits. Never commit secrets — all keys via `.env.local` /
  Cloudflare secrets, with a committed `.env.example`.

## Working agreement for subagents
- Read this brief and `.agents/source-inventory.md` before starting.
- Stay inside your assigned scope; do not refactor others' files.
- Run `pnpm typecheck` and `pnpm lint` before reporting done.
- Report back concisely: what you built, files touched, anything blocked.
