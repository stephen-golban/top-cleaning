# Deploying topcleaning.md

**The site is live.** It was first deployed on 2026-09-01 to the Cloudflare Worker
`top-cleaning`, and `topcleaning.md` + `www.topcleaning.md` are attached to it as Custom
Domains. This file is now the record of how that was done and the runbook for doing it
again.

Written for someone who is not a developer. Every command is written out in full.
Open a Terminal window, and before anything else move into the project folder:

```bash
cd ~/Development/top-cleaning
```

Everything below is typed into that same window.

---

## Where things stand

| Thing | Value |
| --- | --- |
| Worker name | `top-cleaning` |
| Account | `Golban.stephen@gmail.com's Account`, `b8348ba8b3e65b3b3dd2ad6324a280f6` |
| Zone | `topcleaning.md`, `680a1e763177ef5225c3c7623b978b6b`, **active** |
| Live site | <https://topcleaning.md> (apex is canonical) |
| Also serves | <https://www.topcleaning.md> → 308 → apex |
| Preview URL | <https://top-cleaning.ibeep.workers.dev> (still public — see "Loose ends") |
| Certificate | Google Trust Services `WE1`, issued by Cloudflare, auto-renewing |

---

## Before you start

1. **A Cloudflare account you can log into** — `golban.stephen@gmail.com`.
2. **Node 22 or newer and pnpm.** Check with `node --version`.
3. That is all. The domain, the zone, the DNS and the certificate already exist.

> ### About secrets
>
> Some values below are passwords in all but name — an API key, a signing key, a video
> link token. **Never paste one into a chat window, an email, a ticket, or a commit.**
> Every command that needs one asks you to type it into a prompt that does not echo it
> back and does not save it to your shell history. That is the only place they go.

---

## Step 1 — Confirm you are logged into the right Cloudflare account

```bash
npx wrangler whoami
```

It prints the email and account it will deploy as. If it is not
`golban.stephen@gmail.com`, run `npx wrangler login` and sign in as the right person.

---

## Step 2 — Check the code is healthy

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm check:i18n
pnpm test
pnpm format:check
```

All six must finish without an error. If any of them fails, **stop** — do not deploy a
build that does not pass its own checks.

---

## Step 3 — Set the site's public address (this is the one that bites)

`NEXT_PUBLIC_SITE_URL` is a **build-time** value, not a runtime one. Next inlines it into
the JavaScript and the pre-rendered HTML while `pnpm build` runs. Putting it in
`wrangler.jsonc` under `vars`, or setting it as a Cloudflare secret, does **nothing** —
by the time the Worker runs, the wrong value is already baked into every page.

What it controls: `<link rel="canonical">`, all four `hreflang` alternates, `og:url`,
`og:image`, every `<loc>` in `/sitemap.xml`, the `Host:` and `Sitemap:` lines in
`robots.txt`, every absolute URL in the JSON-LD, and — since 2026-09-01 — the hostname
the `www` → apex redirect matches on.

Create a file named `.env.production` in the project folder containing exactly one line:

```bash
echo 'NEXT_PUBLIC_SITE_URL=https://topcleaning.md' > .env.production
```

No trailing slash. This is not a secret — it is the public address of the site — so it is
fine that it sits in a plain file. It is in `.gitignore`, so it is not committed, which
is exactly why it has to be recreated on any machine that deploys.

Belt and braces: you can also put it on the command line, where it wins over the file.
That is what the 2026-09-01 deploy did:

```bash
NEXT_PUBLIC_SITE_URL=https://topcleaning.md npx opennextjs-cloudflare build
NEXT_PUBLIC_SITE_URL=https://topcleaning.md npx opennextjs-cloudflare deploy
```

**Check the build before you ship it.** After the build step, this must print `0`:

```bash
grep -rc "localhost:3000" .open-next/cache/*/ro.cache
```

and this must print `https://topcleaning.md/ro`:

```bash
node -e 'const d=require("fs").readdirSync(".open-next/cache")[0];
const h=JSON.parse(require("fs").readFileSync(`.open-next/cache/${d}/ro.cache`)).html;
console.log(h.match(/<link rel="canonical" href="([^"]+)"/)[1])'
```

If it says `localhost`, stop and fix `.env.production` — do not deploy.

---

## Step 4 — Put the secrets into Cloudflare

Secrets are runtime values, stored by Cloudflare, never in the project. Each command
below opens a prompt; type or paste the value there and press Enter. Nothing is written
to your screen or your shell history. The Worker already exists, so none of these will
ask to create it.

**As of 2026-09-01 no secrets are set** — `npx wrangler secret list` prints `[]`.

### 4a. The quote form (do this, or the form cannot email anyone)

The contact form is delivered by [Resend](https://resend.com). Without these two the form
still works and still validates, but it shows the visitor "the request could not be sent,
here is our phone number" instead of a confirmation — deliberately, so nobody is ever
told a message was delivered when it was not. Every undelivered submission is written to
the Worker log as `[quote] UNDELIVERED`, readable with `npx wrangler tail`.

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put QUOTE_NOTIFY_EMAIL
```

- `RESEND_API_KEY` — from resend.com → API Keys → Create API Key. Starts `re_`.
- `QUOTE_NOTIFY_EMAIL` — the inbox that should receive quote requests, e.g.
  `info@topcleaning.md`.

Optionally, the address the emails are sent **from**:

```bash
npx wrangler secret put QUOTE_FROM_EMAIL
```

If you skip it, Resend's shared `onboarding@resend.dev` sender is used. That works with
no setup at all, **but it only delivers to the address that owns the Resend account**.
For real use, verify `topcleaning.md` inside Resend (see "Verifying topcleaning.md in
Resend" below) and set this to something like `Top Cleaning <site@topcleaning.md>`.

Secrets are read at runtime, so a `secret put` takes effect on the **next** request — no
redeploy needed.

### 4b. The private client videos (only if you are using them)

Skip this whole section if no QR-code videos exist yet. The site works fine without it;
`/v/<anything>` simply shows "this link is no longer valid".

```bash
npx wrangler secret put CF_STREAM_SIGNING_KEY_ID
npx wrangler secret put CF_STREAM_SIGNING_KEY_PEM
npx wrangler secret put CF_STREAM_CUSTOMER_SUBDOMAIN   # optional
npx wrangler secret put PRIVATE_VIDEO_LINKS            # optional
```

`.agents/video-setup.md` is the full walkthrough. Note the constraint recorded in
`.agents/infra.md`: the OAuth token wrangler is logged in with has **no Cloudflare Stream
scope**, so the signing key itself has to be created from the dashboard with an API token
carrying `Stream:Edit` + `Account Settings:Read`.

`CF_ACCOUNT_ID` and `CF_STREAM_API_TOKEN` from `.env.example` are **not** needed here.
They are only used by the helper scripts you run on your own machine.

### 4c. Check what is set

```bash
npx wrangler secret list
```

This prints the *names* of the secrets, never their values.

---

## Step 5 — Deploy

```bash
pnpm deploy
```

This runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`. It takes a
couple of minutes and finishes with:

```
  https://top-cleaning.ibeep.workers.dev
Current Version ID: <uuid>
```

**Write that version id down.** It is what you roll back to.

> **If it fails with `assets-upload-session ... [code: 10013]`** — that is a Cloudflare
> API 500, and it happened on the very first deploy on 2026-09-01. It is transient.
> Run `npx wrangler deploy` again (the build output is still on disk, so there is no need
> to rebuild) and it goes through.

A deploy takes roughly 30–60 seconds to reach every edge location. Immediately after
`Deployed`, some requests still 404. That is propagation, not a broken build — wait a
minute before concluding anything.

---

## Step 6 — Attaching the domain (already done; here for the record)

Both hostnames are attached as **Custom Domains** on the Worker. Cloudflare owns the DNS
record and the certificate for each; there is no hand-made `A` or `CNAME` for `@` or
`www`, and there must not be — a hand-made record fights the Custom Domain.

If you ever need to redo it, the dashboard route is:

1. **Compute (Workers)** in the left sidebar → the **top-cleaning** worker.
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**.
3. `topcleaning.md`, then again for `www.topcleaning.md`.

Cloudflare creates the DNS record and issues the certificate itself — normally a minute
or two, occasionally up to 15.

The 2026-09-01 deploy did it over the API instead, because it is scriptable:

```
PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/domains
{"environment":"production","hostname":"topcleaning.md",
 "service":"top-cleaning","zone_id":"680a1e763177ef5225c3c7623b978b6b"}
```

### `www` → apex

The redirect is **in the application**, not in a Cloudflare Redirect Rule. See
`wwwToApex` in `next.config.ts`. It is there because the deploying OAuth token has zone
*read* only and the Rulesets API refuses to write with it, and it turned out to be the
better home anyway: it is version-controlled and the host it folds into is derived from
`NEXT_PUBLIC_SITE_URL` rather than hard-coded.

Two rules, not one, and that matters. A single `/:path*` rule matches the bare root with
`path` unset, and Next then emits the **literal** string `https://topcleaning.md/:path*`
as the `Location` header. That shipped for about two minutes on 2026-09-01 before it was
caught. `/:path+` requires at least one segment, so `/` gets its own rule.

Static files under `/_next/static`, `/fonts` and `/images` are answered by the Worker's
ASSETS binding before any redirect runs, so they still serve on `www`. Harmless — none of
them are indexable documents.

---

## Step 7 — Smoke checklist

Work down this list in a browser on the real domain.

**The basics**

- [ ] `https://topcleaning.md` loads and immediately becomes `https://topcleaning.md/ro`.
- [ ] The padlock shows in the address bar (valid HTTPS certificate).
- [ ] `https://www.topcleaning.md` redirects to the apex, including the bare root.

**All three languages**

- [ ] `/ro` — Romanian, and the diacritics look right: `Curățenie după reparație`.
- [ ] `/ru` — Russian, and **the text is in the same serif as the Romanian page**, not a
      default system font. If Russian looks like Times New Roman, the Cyrillic font file
      is not being served.
- [ ] `/en` — English.
- [ ] The RO/RU/EN switcher in the header moves between the matching pages
      (`/ro/servicii` ↔ `/ru/uslugi` ↔ `/en/services`), not back to the home page.

**Every page**

- [ ] `/ro/servicii`, `/ru/uslugi`, `/en/services`
- [ ] One service page in each language, e.g. `/ro/servicii/curatenie-dupa-reparatie`
- [ ] `/ro/despre-noi`, `/ru/o-nas`, `/en/about`
- [ ] `/ro/contact`, `/ru/kontakty`, `/en/contact`
- [ ] Photographs load on all of them (not grey or blurred boxes).

Or do all 24 at once, from the sitemap:

```bash
curl -s https://topcleaning.md/sitemap.xml |
  grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' |
  while read -r u; do echo "$(curl -s -o /dev/null -w '%{http_code}' "$u") $u"; done
```

Every line must start with `200`.

**The old site's links still work** — these should land on the new pages, not a 404:

- [ ] `https://topcleaning.md/despre-noi` → `/ro/despre-noi`
- [ ] `https://topcleaning.md/servicii-de-curatenie/servicii-curatenie-generala`
      → `/ro/servicii/curatenie-generala`
- [ ] `https://topcleaning.md/ru/uslugi-po-uborke` → `/ru/uslugi`

**The quote form** — the one thing that can silently fail:

- [ ] Open `/ro/contact`, fill in the three fields, submit.
- [ ] You get the green confirmation panel, **not** the "could not be sent" one.
- [ ] The email actually arrives at `QUOTE_NOTIFY_EMAIL`. Check spam.
- [ ] If it says "could not be sent": the Resend secrets are missing or wrong. Fix them
      with `wrangler secret put`. No redeploy needed. Nothing is lost in the meantime —
      every undelivered submission is in `npx wrangler tail` as `[quote] UNDELIVERED`.

**Search engines**

- [ ] `https://topcleaning.md/robots.txt` loads and contains `Disallow: /v/`.
- [ ] `https://topcleaning.md/sitemap.xml` loads, lists 24 URLs, and — check this —
      contains **no** address with `/v/` in it.
- [ ] View source on `/ro` and confirm
      `<link rel="canonical" href="https://topcleaning.md/ro"/>`. If it says `localhost`,
      step 3 was skipped: fix it and deploy again.
- [ ] Paste `https://topcleaning.md/ro` into a WhatsApp message to yourself. The preview
      card should show the Top Cleaning logo image and the Romanian description.

**The private videos** (skip if you did not do step 4b)

- [ ] `https://topcleaning.md/v/made-up-nonsense` shows "this link is no longer valid",
      not an error page and not a video.
- [ ] A real QR link plays its video.
- [ ] Search Google for `site:topcleaning.md/v` — nothing should ever appear here.

---

## Verifying topcleaning.md in Resend

Only needed if you want the quote emails to come **from** `@topcleaning.md` rather than
from Resend's shared `onboarding@resend.dev`.

In Resend: **Domains** → **Add Domain** → `topcleaning.md` → pick the region (**EU
(Ireland)** is the closest to Moldova; the region is **immutable** once chosen). Resend
then shows you a table of DNS records.

**Copy those values verbatim.** The DKIM key is generated per-domain and cannot be
guessed or looked up. What you will see is:

| Type | Name / host | Value |
| --- | --- | --- |
| `MX` | `send.topcleaning.md` | `feedback-smtp.<region>.amazonses.com` (priority `10`) |
| `TXT` | `send.topcleaning.md` | `v=spf1 include:amazonses.com ~all` |
| `TXT` or `CNAME` | `resend._domainkey.topcleaning.md` | the long DKIM key Resend shows you |

Domains created after August 2026 are issued **CNAME**-style DKIM records instead of TXT;
take whichever Resend actually renders.

Adding them in Cloudflare: **DNS** → **Records** → **Add record** for the
`topcleaning.md` zone.

- Cloudflare auto-appends the zone name, so type `send` — not `send.topcleaning.md` —
  and `resend._domainkey`, not `resend._domainkey.topcleaning.md`.
- If Resend gives you a **CNAME** for DKIM, set the proxy status to **DNS only** (grey
  cloud). A proxied (orange-cloud) CNAME resolves to Cloudflare's IPs and DKIM breaks.
- `MX` and `TXT` records are never proxied; there is nothing to set on those.
- Do not touch the existing `topcleaning.md` and `www` records — those are the Worker's
  Custom Domains and Cloudflare manages them.

Recommended, not required by Resend:

| Type | Name / host | Value |
| --- | --- | --- |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<an inbox you read>` |

Then press **Verify** in Resend. It usually goes green within 15 minutes.

Finally point the site at it:

```bash
npx wrangler secret put QUOTE_FROM_EMAIL     # e.g. Top Cleaning <site@topcleaning.md>
```

---

## Deploying again later

```bash
pnpm lint && pnpm typecheck && pnpm check:i18n && pnpm test
echo 'NEXT_PUBLIC_SITE_URL=https://topcleaning.md' > .env.production   # if missing
pnpm deploy
```

Secrets and the custom domains stay attached; you do not redo steps 4 or 6.

Pages are served with a long shared-cache lifetime, and a deploy replaces them — but if
you still see an old page after deploying, empty the cache in the Cloudflare dashboard
(zone → **Caching** → **Configuration** → **Purge Everything**) and reload.

---

## Rolling back

Cloudflare keeps every version of the Worker. A rollback is a routing change, not a
rebuild, so it takes seconds and cannot fail on a broken build.

**1. Find the version you want.**

```bash
npx wrangler versions list
npx wrangler deployments list
```

`versions list` is every upload, oldest first. `deployments list` is which of them was
actually serving traffic, and when. You want the version id of the last deployment that
was known good — a 32-character uuid like `f6c04047-cde0-4b31-9d9a-e3cd0c622572`.

**2. Roll back.**

```bash
npx wrangler rollback
```

With no argument this offers the previous deployment and asks for confirmation. To go to
a specific one:

```bash
npx wrangler rollback <version-id> --message "why you rolled back"
```

**3. Confirm.**

```bash
npx wrangler deployments list | tail -20
curl -s -o /dev/null -w '%{http_code}\n' https://topcleaning.md/ro
```

**What a rollback does not undo.** Secrets are not versioned — a rollback keeps whatever
`wrangler secret put` last set. Static assets are uploaded per-version and roll back with
the Worker. Custom domains, DNS and the certificate are untouched. And because
`NEXT_PUBLIC_SITE_URL` is baked in at build time, rolling back to a version that was
built with the wrong site URL brings that wrong URL back with it.

Known-good versions, for reference:

| Version ID | Deployed | What it is |
| --- | --- | --- |
| `cb1275f2-f587-45c9-a31c-938112d1fcc8` | 2026-09-01 10:33Z | first live deploy, no `www` redirect |
| `f6c04047-cde0-4b31-9d9a-e3cd0c622572` | 2026-09-01 10:37Z | `www` redirect, **broken on the bare root** |
| `5b65ca7c-48cd-4b5e-8cea-62f60f301799` | 2026-09-01 10:39Z | current; `www` redirect correct |

---

## If something goes wrong

**See what the server is actually doing:**

```bash
npx wrangler tail
```

Leave that running and load the page that misbehaves. Errors and log lines appear live.
This is also where undelivered quote requests show up, prefixed `[quote] UNDELIVERED`.

**Try the exact production build on your own machine** — same Cloudflare runtime, no
deploy, nothing published:

```bash
pnpm preview
```

**`Could not resolve host: topcleaning.md` from your own machine.** Not a deploy problem.
The domain had no `A` record for a long time and some resolvers (home routers especially)
cache that absence. `dig +short A topcleaning.md @1.1.1.1` will show the real answer. It
clears itself within the hour; to test before then, use
`curl --resolve topcleaning.md:443:<ip> https://topcleaning.md/ro`.

---

## Loose ends, as of 2026-09-01

1. **`https://top-cleaning.ibeep.workers.dev` is still public** and serves the whole site.
   Every page on it carries a canonical pointing at `topcleaning.md`, so search engines
   will consolidate — but if you want it gone, add `"workers_dev": false` to
   `wrangler.jsonc` and redeploy. It is useful as a staging URL, which is why it is
   still there.
2. **Cloudflare injects a managed `robots.txt` block** ahead of the site's own. It adds
   `Content-Signal: search=yes,ai-train=no,use=reference` and `Disallow: /` for ten AI
   crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot, Bytespider, …). The site's own
   `Disallow: /v/` group still applies — crawlers merge groups with the same
   `User-agent` — but Lighthouse scores `robots.txt` as invalid because it does not
   recognise `Content-Signal:`, which is the entire reason the live SEO score is 92 and
   not 100. To change it: Cloudflare dashboard → the account → **AI Crawl Control** →
   **Robots.txt** → turn managed robots.txt off, or switch it to a policy you chose.
   This needs the dashboard; the deploying OAuth token cannot write zone settings.
3. **No secrets are set.** The quote form cannot deliver and `/v/` cannot play video.
4. **DNS records could not be enumerated** during the deploy — the OAuth token has
   `zone (read)` but not `#dns_records:read`, so `GET /zones/{id}/dns_records` returns
   `10000 Authentication error`. The zone was confirmed active and both hostnames were
   confirmed to serve the Worker over HTTPS, which is the outcome that matters, but
   nobody has actually looked at the record list. Worth a glance in the dashboard for
   leftovers from the old site.

---

## Things this file deliberately does not do

- **It does not add routes or custom domains to `wrangler.jsonc`.** The Custom Domains
  are attached to the Worker on Cloudflare's side, which keeps DNS, the certificate and
  the route as one operation Cloudflare manages, and keeps the repo free of an opinion
  about which domain it lives on.
- **It never asks anyone to send a secret in a message.** If someone asks you to paste an
  API key into a chat, that is the wrong process regardless of who is asking.
