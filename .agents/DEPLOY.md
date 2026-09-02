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
| Plain HTTP | 308 → HTTPS, in the app — see "HTTPS and HSTS" |
| HSTS | `max-age=31536000; includeSubDomains`, no `preload` |
| Preview URL | none — `workers.dev` was turned off on 2026-09-01 (see "The workers.dev URL") |
| Certificate | Google Trust Services `WE1`, issued by Cloudflare, auto-renewing |
| Current version | `ada1deb5-1843-4094-8273-1229d94a137a`, deployed 2026-09-02 |
| Quote requests | delivered to Telegram, verified live — see `.agents/telegram-setup.md` |

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

### Nothing but `NEXT_PUBLIC_*` may go in a `.env` file

This is the other half of the same rule, and it bites harder. Next loads `.env`,
`.env.local` and `.env.production` while it builds, and `@opennextjs/cloudflare`
**writes everything it loaded into `.open-next/cloudflare/next-env.mjs`, which is
bundled into the Worker that gets uploaded.** A `TELEGRAM_BOT_TOKEN=` line in
`.env.local` therefore does not just configure your laptop — it is uploaded to
Cloudflare in plaintext, inside the script, where it shadows the real
`wrangler secret`, survives `wrangler secret delete`, and can be read back by anyone
with access to the Worker.

That happened. The 2026-09-02 deploy `fdaf2174` shipped the live bot token this way
before it was caught; `ada1deb5` is the rebuilt, clean replacement. See "The
2026-09-02 deploy" below.

So the split is:

| Where | What belongs there | Read when |
| --- | --- | --- |
| `.env.production` | `NEXT_PUBLIC_SITE_URL` and nothing else | build time, inlined into pages |
| `.dev.vars` (gitignored) | runtime secrets, for `pnpm preview` / `wrangler dev` | runtime, local only, never bundled |
| `wrangler secret put` | runtime secrets, for the live site | runtime, on Cloudflare |

`pnpm deploy` now enforces it. Between build and upload it runs
`node scripts/check-build-env.mjs`, which reads the generated
`next-env.mjs` and **aborts the deploy** if it carries any key that is not
`NEXT_PUBLIC_*`. Run it on its own with `pnpm check:build-env`. If it fails, move the
named variables into `.dev.vars` and `wrangler secret put` — do not work around it.

One consequence worth knowing: `pnpm dev` (plain `next dev`) does not read `.dev.vars`,
so the quote form there will show the "could not be sent" panel. That is correct, not a
bug. To exercise real delivery locally use `pnpm preview`, which runs the actual
workerd runtime and does read `.dev.vars`.

---

## Step 4 — Put the secrets into Cloudflare

Secrets are runtime values, stored by Cloudflare, never in the project. Each command
below opens a prompt; type or paste the value there and press Enter. Nothing is written
to your screen or your shell history. The Worker already exists, so none of these will
ask to create it.

**As of 2026-09-02 three secrets are set** — `npx wrangler secret list` prints
`QUOTE_NOTIFY_EMAIL`, `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The quote form
delivers over Telegram and this has been verified end to end against the live site
(see "The 2026-09-02 deploy"). `RESEND_API_KEY` is still unset, which is fine:
Telegram takes precedence over Resend anyway, and email is only the fallback nobody
has asked for. Secrets survive a redeploy — verified across the `workers_dev` deploy
on 2026-09-01 and again across both 2026-09-02 deploys — so you set them once.

### 4a. The quote form (do this, or the form cannot reach anyone)

The contact form is delivered over **Telegram** — already set up and verified; see
`.agents/telegram-setup.md`. These are the two secrets it needs:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Without them the form still works and still validates, but it shows the visitor "the
request could not be sent, here is our phone number" instead of a confirmation —
deliberately, so nobody is ever told a message was delivered when it was not. Every
undelivered submission is written to the Worker log as `[quote] UNDELIVERED`, with the
whole submission attached so it is recoverable, readable with `npx wrangler tail`.

Email delivery via [Resend](https://resend.com) is still in the code as a fallback and
still has no API key. When both are configured **Telegram wins**. To go back to email,
delete the two Telegram secrets and set these instead:

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

`CF_ACCOUNT_ID` and `CF_STREAM_API_TOKEN` from `.env.example` are **not** needed here,
and should not be set here. They are local CLI credentials used only by
`pnpm video:stream` on your own machine; the Worker has no use for them.

As in 4a, these are runtime bindings — a `secret put` takes effect on the **next**
request, with no redeploy. Locally the same values go in `.dev.vars`. **Never in
`.env.local`**: Next reads `.env*` at build time and OpenNext bundles what it read into
the uploaded Worker, so a signing key there would be published inside the site's own
source. `pnpm deploy` runs `scripts/check-build-env.mjs` and aborts if that happens.

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
Uploaded top-cleaning (14.89 sec)
No targets deployed for top-cleaning (3.43 sec)
Current Version ID: <uuid>
```

**Write that version id down.** It is what you roll back to.

> **`No targets deployed` is not an error and does not mean the deploy failed.** Since
> `workers_dev` was turned off, `wrangler.jsonc` declares no routes at all — and it
> deliberately does not (see "Things this file does not do"). The two hostnames are
> **Custom Domains** attached on Cloudflare's side, and they always serve whichever
> version is the current deployment, so the new version goes live on `topcleaning.md`
> regardless of what that line says. Confirm with `npx wrangler deployments list` — the
> newest entry should be `(100%)` — and by loading the real domain.
>
> You will also see: `Because your 'workers.dev' route is disabled and your
> 'preview_urls' setting is not in your Wrangler file, Preview URLs will be disabled`.
> That is the intended consequence of the change; leave it.

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
- [ ] `http://topcleaning.md` (type the `http://` explicitly) lands on **https**.
- [ ] A page over HTTPS carries `Strict-Transport-Security`, and the plain-HTTP
      redirect does **not**. See "HTTPS and HSTS" for the one-liner that checks both.

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
| `5b65ca7c-48cd-4b5e-8cea-62f60f301799` | 2026-09-01 10:39Z | `www` redirect correct; `workers.dev` still public |
| `185a1081-0b7c-4a99-adb1-35b734c73485` | 2026-09-01 10:46Z | same code; version cut by a `wrangler secret put` |
| `e35e1570-bce1-4b99-a112-837ce67ff57c` | 2026-09-01 11:00Z | `workers_dev: false` — `workers.dev` retired |
| `399840ff-9b01-480f-8968-24c8c284dd82` | 2026-09-01 11:26Z | **do not deploy** — unanchored `has` pattern; every HTTPS request redirected to itself |
| `b177851e-bf42-4996-8fc5-69859b5c25c7` | 2026-09-01 11:39Z | HTTP → HTTPS `308` + HSTS; last pre-Telegram build |
| `e858b3f1-6255-4bb4-8566-fc1cd47e2553` | 2026-09-02 07:07Z | same code; version cut by the two Telegram `secret put`s |
| `fdaf2174-8a34-4811-9e4b-57bd860f79fb` | 2026-09-02 07:10Z | **do not deploy** — Telegram works, but the bot token is baked into the bundle |
| `ada1deb5-1843-4094-8273-1229d94a137a` | 2026-09-02 07:18Z | **current**; identical code, rebuilt with no secrets in the bundle |

If turning `workers.dev` off ever appears to break the live domain, `npx wrangler
rollback 185a1081-0b7c-4a99-adb1-35b734c73485` returns to the last version that had the
subdomain enabled. Note that a rollback restores the *Worker version*, not the account
setting: `workers_dev` is read from `wrangler.jsonc` at deploy time, so to genuinely put
the subdomain back you must also set it to `true` (or delete the line) and redeploy.

---

## The 2026-09-02 deploy

The first deploy of the Telegram quote delivery. Two versions were uploaded; the second
is the one that matters.

**What shipped.** `40b848f` — the Telegram provider — had been committed on 2026-09-01
but never deployed, so the live site was still running the pre-Telegram build even
though both secrets were already set. `fdaf2174` deployed it. `ada1deb5` redeployed the
identical code after a build fault was found, and is what is live.

**The build fault.** `fdaf2174` was built on a machine whose `.env.local` held
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `QUOTE_NOTIFY_EMAIL`. OpenNext copied all
three into `.open-next/cloudflare/next-env.mjs` and uploaded them inside the Worker
script — the live bot token, in plaintext, in the bundle. The site worked, because the
baked values were correct; it was a disclosure problem, not an outage. It was found
while testing the "no provider configured" path locally: a build that should have had no
Telegram configuration delivered anyway.

The fix was to move the three variables from `.env.local` (build-time) to `.dev.vars`
(runtime, local only, never bundled), delete `.env.local`, rebuild, and redeploy. The
clean bundle inlines exactly one variable, `NEXT_PUBLIC_SITE_URL`. `pnpm deploy` now
runs `scripts/check-build-env.mjs` between build and upload so this cannot recur
silently — see "Nothing but `NEXT_PUBLIC_*` may go in a `.env` file" in Step 3.

**The token was rotated, on 2026-09-02.** The original judgement — that the only party
who could read the bundle is the account owner, who already holds the secret — was
sound but not worth relying on. The owner sent `/revoke` to @BotFather and set the
replacement with `wrangler secret put TELEGRAM_BOT_TOKEN`, so **the value inside the
`fdaf2174` bundle is now inert**: revoking invalidates a token everywhere at once, and
nothing needs scrubbing out of Cloudflare's version history.

No redeploy was required and none was done. `wrangler secret put` is a runtime change:
Cloudflare recorded it as version `b21881ab-a2fc-45bd-a645-002b8900d55b` with
`Source: Secret Change` — the same script as `ada1deb5` — and rolled it to 100% itself.
Re-verified by a real submission through `/ro/contact`: success panel, and `wrangler
tail` showing the server action `outcome: ok` with no `[quote] UNDELIVERED`. The
`message_id` and `phone_number` entity were not re-read, because doing so needs the
token; `formatTelegramMessage` is unchanged since `40b848f`, so the auto-link is
unchanged by construction. Full write-up in `.agents/telegram-setup.md`.

**What was verified against the live site**, on `ada1deb5`:

- Three real submissions through the live form — `/ro/contact`, `/ru/kontakty`,
  `/en/contact` — all arriving in Telegram. The anti-spam defences were honoured rather
  than disabled: the honeypot was left empty and a real browser timestamp was posted
  after a genuine four-second wait, so the 2.5-second timing gate ran and passed.
- The service name is localised per submission (`Curățenie generală` / `Генеральная
  уборка` / `Deep cleaning`) and `Limba formularului:` carries the right locale. The
  message chrome itself stays Romanian in all three, by design — the owner reads
  Romanian; only the visitor's own words and their service are in the visitor's
  language.
- **The phone number auto-links.** Telegram returns a `phone_number` entity over
  `+37379022023` on all three messages, so the number is tappable straight into a call.
  This was the one thing `.agents/FOLLOWUPS.md` flagged as unverifiable without a real
  send. It is verified; the documented `<code>` tap-to-copy fallback is not needed.
- The honest-failure path, on workerd with the Telegram variables absent: no success
  panel, the "could not be sent" panel with the phone and WhatsApp links instead, and
  `[quote] UNDELIVERED — no delivery provider configured (missing: …)` in the log with
  the whole submission attached. Re-checked with a deliberately wrong token: same
  panel, `telegram responded 401`, and the token redacted out of the log line.
- Regression sweep: all 24 sitemap URLs 200, no `/v/` path in the sitemap, no
  `localhost` anywhere in it; cleartext `http://` → 308 → HTTPS with no HSTS header on
  the cleartext hop and HSTS present on HTTPS; `/` → `/ro`; `www` → apex; the legacy
  308s still land on 200s; an invalid `/v/` token gives a 404 carrying `x-robots-tag:
  noindex, nofollow, noarchive, nosnippet`, `referrer-policy: no-referrer` and
  `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, leaking no
  token or video id.
- Lighthouse mobile on `/ro`, Lighthouse 12.8.2: performance **92, 96, 98, 92** over
  four runs, median **94** — the original baseline. The single "91" recorded on
  2026-09-01 was run-to-run noise in LCP, not a regression; one run is not a
  measurement here. Accessibility 100, Best Practices 100, SEO 92 (see loose end 2).

Three test messages were left in the owner's Telegram, each saying in its own language
that it is a technical test and using the company's own public number `079 022 023` as
the caller, so no stranger's number appears.

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

## The workers.dev URL

`https://top-cleaning.ibeep.workers.dev` used to serve the entire site alongside
`topcleaning.md`. On **2026-09-01** it was retired, because a second public hostname
serving the same pages is duplicate content and a second front door nobody asked for.

How: `"workers_dev": false` in `wrangler.jsonc`, then a redeploy (version
`e35e1570-bce1-4b99-a112-837ce67ff57c`). No DNS, no zone setting and no Custom Domain was
touched — the flag only governs the `*.workers.dev` subdomain.

What it returns now:

```
HTTP/2 404
content-type: text/plain; charset=UTF-8
content-length: 17

error code: 1042
```

`1042` is Cloudflare's "the Worker has no `workers.dev` route" code. The site itself was
verified unaffected in the same pass: all 24 sitemap URLs 200, all three locales, the
`/` → `/ro` and `www` → apex redirects, `robots.txt`, `sitemap.xml`, the legacy 308s and
the `/v/` 404 all behave exactly as before.

**This also disables Worker Preview URLs**, which shared the same subdomain. If you ever
want a staging URL back without reopening `workers.dev` to the public, add
`"preview_urls": true` to `wrangler.jsonc` — that gives per-version URLs rather than one
permanent public mirror of production.

---

## HTTPS and HSTS

Until 2026-09-01 `http://topcleaning.md` served the whole site over cleartext with a
`200` — no upgrade, no HSTS. Now:

| Request | Response |
| --- | --- |
| `http://topcleaning.md/ro/contact?x=1` | `308` → `https://topcleaning.md/ro/contact?x=1` |
| `http://www.topcleaning.md/ro` | `308` → `https://topcleaning.md/ro` (upgrade and `www` fold in one hop) |
| any HTTPS response | `strict-transport-security: max-age=31536000; includeSubDomains` |
| the plain-HTTP `308` itself | no HSTS — a browser must not be asked to trust a header it received in cleartext |

### Where it lives, and why it is not the zone toggle

The obvious answer is Cloudflare's **Always Use HTTPS** zone setting. The deploying
OAuth token cannot write it, or even read it:

```
PATCH /zones/680a1e763177ef5225c3c7623b978b6b/settings/always_use_https
{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}
```

The same `10000` comes back from the matching `GET`. The token carries `zone (read)`,
which does not extend to zone settings — the same wall the `www` fold hit.

So it is in the application, in two places, for two different reasons:

- **`next.config.ts` → `redirects()`** does the `http` → `https` `308`. Next runs
  `headers` → `redirects` → middleware, so this fires before next-intl looks at the
  path: one hop instead of landing on a locale redirect first, no `NEXT_LOCALE` cookie
  minted on a response the browser will throw away, and it reaches paths the middleware
  matcher skips (anything with a dot, i.e. `/sitemap.xml`).
- **`next.config.ts` → `headers()` *and* `src/middleware.ts`** both set HSTS, and both
  are needed. OpenNext's `routingHandler` returns a middleware result *before* it merges
  the headers from `next.config.ts`, and the site's most-visited URL —
  `https://topcleaning.md/`, which redirects to `/ro` — is exactly such a result. Without
  the middleware half it would be the one response on the site with no HSTS on it.

The scheme itself comes from Cloudflare's `x-forwarded-proto`, with `cf-visitor` as a
fallback. **Not** from `request.url`: inside a Worker that says `https:` whatever the
browser actually spoke, so trusting it would mean never redirecting. Neither header
exists under `pnpm dev` or `pnpm preview`, which is exactly why local plain HTTP keeps
working with no `NODE_ENV` check anywhere.

`src/lib/https.ts` holds the header names, the patterns and the HSTS value, so the
declarative rules and the middleware cannot drift apart. `src/lib/https.test.mts` pins
the behaviour.

### The outage this caused, and the trap to avoid

Version `399840ff-9b01-480f-8968-24c8c284dd82` put **every HTTPS request into an infinite
redirect to itself** and was live for about four minutes before being rolled back to
`e35e1570`. The cause is worth knowing before anyone writes another `has` rule:

**Next and OpenNext compile `has.value` differently.**

| | code | effect |
| --- | --- | --- |
| Next (`prepare-destination.js`) — `next dev`, `next start` | `new RegExp("^" + value + "$")` | anchored |
| OpenNext (`@opennextjs/aws/.../routing/matcher.js`) — Cloudflare | `new RegExp(value)` | **substring** |

An unanchored `value: "http"` therefore matches the header value `https` in production
while behaving perfectly on a developer's machine. Every rule in this repo now writes its
own anchors (`^http$`), which is correct under both: Next's wrapper turns it into
`^^http$$`, and doubled zero-width anchors are harmless.

Two more OpenNext behaviours that follow from the same file:

- **`headers()` never reaches a redirect response.** `handleRedirects` returns before
  `applyMiddlewareHeaders` runs. Convenient here — it is why the cleartext `308` cannot
  accidentally carry HSTS — but it also means a `headers()` rule is not a way to
  annotate a redirect.
- **The two HSTS layers merge in a plain object, which is case-sensitive.** A
  capitalised `Strict-Transport-Security` in the config does not collide with the
  middleware's lowercase key; both survive and Cloudflare joins them into
  `max-age=31536000; includeSubDomains, max-age=31536000; includeSubDomains`. Hence the
  deliberately lowercase constant in `src/lib/https.ts`. **Reproduce this locally before
  deploying** — `npx wrangler dev --local` plus a spoofed header shows all of it:

```bash
npx wrangler dev --port 8788 --local
curl -sSD - -o /dev/null -H 'x-forwarded-proto: http'  http://127.0.0.1:8788/ro   # want 308
curl -sSD - -o /dev/null -H 'x-forwarded-proto: https' http://127.0.0.1:8788/ro   # want 200 + one HSTS
curl -sSD - -o /dev/null                               http://127.0.0.1:8788/ro   # want 200, no HSTS
```

### Two things still answer on plain HTTP

Both sit in front of the Worker, so no amount of application code reaches them.

- **Static assets** — `/favicon.ico`, `/logo.svg`, `/images/*`, `/fonts/*`,
  `/_next/static/*`. The ASSETS binding answers before the Worker runs. Same reason they
  also still serve on `www`; none of them are indexable documents.
- **`/robots.txt`** — Cloudflare's managed robots.txt (see "Loose ends") intercepts this
  one path. Over HTTP it now answers `200` with only Cloudflare's managed block, and
  keeps the Worker's `Location` header on it — a `Location` on a `200` is ignored by
  every client, so the effect is a robots.txt missing the site's own `Disallow: /v/` and
  `Sitemap:` lines. Harmless in practice: crawlers read the HTTPS copy, which is
  complete, `/v/` is protected by `X-Robots-Tag` and unguessable tokens anyway, and every
  `http://` document URL 308s. Verified: `/sitemap.xml` and every other dotted path
  redirect normally, so this is specific to Cloudflare's robots.txt feature.

**Both would be covered by the zone toggle**, which runs earlier in the edge pipeline
than either. That is the case for turning it on as defence in depth the moment a scoped
token exists — see "Loose ends".

### Checking it

```bash
IP=$(dig +short A topcleaning.md @1.1.1.1 | head -1)
curl -sSD - -o /dev/null --resolve topcleaning.md:80:$IP  http://topcleaning.md/ro/contact?x=1
curl -sSD - -o /dev/null --resolve topcleaning.md:443:$IP https://topcleaning.md/ro | grep -i strict
```

Use `--resolve`; this machine's resolver has a stale negative cache for the domain.

---

## Loose ends, as of 2026-09-02

1. ~~**`https://top-cleaning.ibeep.workers.dev` is still public**~~ **Closed
   2026-09-01** — see "The workers.dev URL" below.
2. **Cloudflare injects a managed `robots.txt` block** ahead of the site's own. It adds
   `Content-Signal: search=yes,ai-train=no,use=reference` and `Disallow: /` for ten AI
   crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot, Bytespider, …). The site's own
   `Disallow: /v/` group still applies — crawlers merge groups with the same
   `User-agent`. It also costs a Lighthouse SEO point: Lighthouse flags
   `Content-Signal:` as an "Unknown directive" (line 30 of the served `robots.txt`),
   which is the *only* failing SEO audit. That reads **92** under Lighthouse 12.8.2 on
   2026-09-02. It briefly read 100 on 2026-09-01 under a different Lighthouse build —
   the site did not change, the linter did, so treat the 100 as the anomaly and do not
   go hunting for a regression. Nothing is actually wrong: the directive is Cloudflare's
   and real crawlers ignore what they do not understand.
   What remains is that this feature also intercepts `/robots.txt` over plain
   HTTP ahead of the Worker — see "HTTPS and HSTS", "Two things still answer on plain
   HTTP". To change it: Cloudflare dashboard → the account → **AI Crawl Control** →
   **Robots.txt** → turn managed robots.txt off, or switch it to a policy you chose.
   This needs the dashboard; the deploying OAuth token cannot write zone settings.
3. **"Always Use HTTPS" is still off at the zone level.** The redirect and HSTS are
   enforced by the application instead (see "HTTPS and HSTS"), which covers every
   document the Worker serves. The zone toggle is still worth turning on the day someone
   has a token or a dashboard session: it runs earlier in the edge pipeline than the
   Worker, so it also covers the two things the app cannot reach — static assets and
   Cloudflare's managed `/robots.txt` — and it survives a bad deploy. Dashboard →
   the zone → **SSL/TLS** → **Edge Certificates** → **Always Use HTTPS**. The two are
   complementary; enabling it does not make the application rules redundant, because
   those are the ones that live in version control.
4. ~~**Only `QUOTE_NOTIFY_EMAIL` is set** — the quote form cannot deliver.~~ **Closed
   2026-09-02** — `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set and delivery is
   verified end to end against the live site. What is still open from this item is the
   video half: no `CF_STREAM_*` secret is set, so `/v/` cannot play video.
5. **DNS records could not be enumerated** during the deploy — the OAuth token has
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
