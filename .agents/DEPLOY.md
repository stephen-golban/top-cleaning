# Deploying topcleaning.md

Written for someone who is not a developer. Every command is written out in full.
Open a Terminal window, and before anything else move into the project folder:

```bash
cd ~/Development/top-cleaning
```

Everything below is typed into that same window.

**Nothing in this file has been run.** The site has never been deployed. It has been
built, run on the real Cloudflare runtime locally, and audited — but not published.

---

## Before you start

You need three things:

1. **A Cloudflare account** you can log into. The one already set up is
   `golban.stephen@gmail.com`, account ID `b8348ba8b3e65b3b3dd2ad6324a280f6`.
2. **The `topcleaning.md` domain in that Cloudflare account**, as a "zone". Step 5 checks
   this and tells you what to do if it is not there yet.
3. **Node 22 or newer and pnpm.** Check with `node --version` — it should print `v22`
   or higher.

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
```

All five must finish without an error. If any of them fails, **stop** — do not deploy a
build that does not pass its own checks.

---

## Step 3 — Set the site's public address

The site bakes its own web address into every page at build time — the `<link rel=
"canonical">` tags, the hreflang tags that tell Google about the Romanian, Russian and
English versions, the sitemap, and the preview image used when someone shares a link on
WhatsApp. If it is wrong, all of those point at the wrong place.

Create a file named `.env.production` in the project folder containing exactly one line:

```
NEXT_PUBLIC_SITE_URL=https://topcleaning.md
```

You can make it in one command:

```bash
echo 'NEXT_PUBLIC_SITE_URL=https://topcleaning.md' > .env.production
```

No trailing slash. This is not a secret — it is the public address of the site — so it
is fine that it sits in a plain file. It is already listed in `.gitignore`, so it will
not be committed.

---

## Step 4 — Put the secrets into Cloudflare

Secrets are stored by Cloudflare, not in the project. Each command below opens a prompt;
type or paste the value there and press Enter. Nothing is written to your screen or your
shell history.

The Worker does not exist yet, so the first `wrangler secret put` will ask
`Would you like to create it?` — answer **yes**. Subsequent ones will not ask again.

### 4a. The quote form (do this, or the form cannot email anyone)

The contact form is delivered by [Resend](https://resend.com). Without these two the form
still works and still validates, but it shows the visitor "the request could not be sent,
here is our phone number" instead of a confirmation — deliberately, so nobody is ever
told a message was delivered when it was not.

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put QUOTE_NOTIFY_EMAIL
```

- `RESEND_API_KEY` — from resend.com → API Keys → Create API Key.
- `QUOTE_NOTIFY_EMAIL` — the inbox that should receive quote requests, e.g.
  `info@topcleaning.md`.

Optionally, the address the emails are sent **from**:

```bash
npx wrangler secret put QUOTE_FROM_EMAIL
```

If you skip it, Resend's shared `onboarding@resend.dev` sender is used. That works with
no setup at all, **but it only delivers to the address that owns the Resend account**.
For real use, verify `topcleaning.md` inside Resend and set this to something like
`site@topcleaning.md`.

### 4b. The private client videos (only if you are using them)

Skip this whole section if no QR-code videos exist yet. The site works fine without it;
`/v/<anything>` simply shows "this link is no longer valid".

```bash
npx wrangler secret put CF_STREAM_SIGNING_KEY_ID
npx wrangler secret put CF_STREAM_SIGNING_KEY_PEM
npx wrangler secret put CF_STREAM_CUSTOMER_SUBDOMAIN   # optional
npx wrangler secret put PRIVATE_VIDEO_LINKS            # optional
```

`.agents/video-setup.md` is the full walkthrough for where these values come from. The
short version: `CF_STREAM_SIGNING_KEY_ID` and `CF_STREAM_SIGNING_KEY_PEM` are the pair
Cloudflare gives you when you create a Stream signing key; `PRIVATE_VIDEO_LINKS` is an
optional JSON list of links, which lets you add or revoke a video without a code change.

`CF_ACCOUNT_ID` and `CF_STREAM_API_TOKEN` from `.env.example` are **not** needed here.
They are only used by the helper scripts you run on your own machine.

### 4c. Check what is set

```bash
npx wrangler secret list
```

This prints the *names* of the secrets, never their values.

---

## Step 5 — Check the domain is in Cloudflare

Open <https://dash.cloudflare.com>, sign in, and look at the list of sites on the home
page.

**If `topcleaning.md` is in that list**, note whether its status says *Active*. Skip to
step 6.

**If it is not in that list**, add it: *Add a site* → type `topcleaning.md` → choose the
Free plan → Cloudflare shows you two nameservers, something like
`xxx.ns.cloudflare.com`. Go to whoever the `.md` domain is registered with, replace the
existing nameservers with those two, and save. It usually goes Active within an hour,
sometimes up to 24. **You cannot attach the custom domain in step 7 until it is Active.**

> `topcleaning.md` was not resolving when this project was built — the old site was
> already down. So expect that the DNS may need setting up from scratch rather than
> adjusting.

---

## Step 6 — Deploy

```bash
pnpm deploy
```

This builds the site, converts it for Cloudflare Workers, and uploads it. It takes a
couple of minutes. When it finishes, wrangler prints a URL like:

```
https://top-cleaning.<your-subdomain>.workers.dev
```

**Open that URL and click around.** This is the live site, just not yet on its own
domain. If something is wrong, it is much easier to fix now than after the domain points
at it.

---

## Step 7 — Attach the domain

Two hostnames, both pointed at the Worker: `topcleaning.md` and `www.topcleaning.md`.

In the Cloudflare dashboard:

1. **Compute (Workers)** in the left sidebar → click the **top-cleaning** worker.
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**.
3. Type `topcleaning.md`. Click **Add domain**.
4. Do it again for `www.topcleaning.md`.

Cloudflare creates the DNS records itself and issues the HTTPS certificate. It normally
takes a minute or two; occasionally up to 15. Until the certificate is issued you may see
a browser security warning — that is expected, and it goes away on its own.

### What the DNS should look like afterwards

Under **DNS → Records** for the `topcleaning.md` zone you should see two records that
Cloudflare created and manages:

| Type    | Name              | Content                    | Proxy               |
| ------- | ----------------- | -------------------------- | ------------------- |
| (Worker) | `topcleaning.md`  | managed by Cloudflare      | Proxied (orange)    |
| (Worker) | `www`             | managed by Cloudflare      | Proxied (orange)    |

Do not add `A` or `CNAME` records for these names by hand — a Custom Domain manages its
own record, and a hand-made one will fight it. **Delete any leftover `A`, `AAAA` or
`CNAME` record for `@` or `www` pointing at the old site**, or the old host may keep
answering.

### Making `www` redirect to the bare domain

Both hostnames will serve the site, which means Google can see two copies of it. The
`<link rel="canonical">` on every page already tells Google that `https://topcleaning.md`
is the real one, so this is tidiness rather than an emergency — but do it:

Cloudflare dashboard → the `topcleaning.md` zone → **Rules** → **Redirect Rules** →
**Create rule**:

- Name: `www to apex`
- When incoming requests match: **Custom filter expression** → Field `Hostname`,
  Operator `equals`, Value `www.topcleaning.md`
- Then: **Dynamic redirect**, Expression
  `concat("https://topcleaning.md", http.request.uri.path)`, Status **301**,
  *Preserve query string* ticked.

---

## Step 8 — Smoke checklist

Work down this list in a browser on the real domain. Everything here was verified locally
against the same build, so anything that fails is a deployment problem, not a code one.

**The basics**

- [ ] `https://topcleaning.md` loads and immediately becomes `https://topcleaning.md/ro`.
- [ ] The padlock shows in the address bar (valid HTTPS certificate).
- [ ] `https://www.topcleaning.md` reaches the site (and redirects, if you did step 7's
      redirect rule).

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
      with `wrangler secret put` and run `pnpm deploy` again. Nothing is lost in the
      meantime — every undelivered submission is written to the Worker's log, which you
      can read with `npx wrangler tail`.

**Search engines**

- [ ] `https://topcleaning.md/robots.txt` loads and contains `Disallow: /v/`.
- [ ] `https://topcleaning.md/sitemap.xml` loads, lists 24 URLs, and — check this —
      contains **no** address with `/v/` in it.
- [ ] View source on `/ro` and confirm `<link rel="canonical" href="https://topcleaning.md/ro"/>`.
      If it says `localhost`, `.env.production` from step 3 was missing at build time:
      fix it and deploy again.
- [ ] Paste `https://topcleaning.md/ro` into a WhatsApp message to yourself. The preview
      card should show the Top Cleaning logo image and the Romanian description.

**The private videos** (skip if you did not do step 4b)

- [ ] `https://topcleaning.md/v/made-up-nonsense` shows "this link is no longer valid",
      not an error page and not a video.
- [ ] A real QR link plays its video.
- [ ] Search Google for `site:topcleaning.md/v` — nothing should ever appear here.

---

## Deploying again later

Once the above is done, every future update is just:

```bash
pnpm lint && pnpm typecheck && pnpm check:i18n && pnpm test
pnpm deploy
```

Secrets and the custom domain stay attached; you do not redo steps 4, 5 or 7.

Pages are served with a long shared-cache lifetime, and a deploy replaces them — but if
you still see an old page after deploying, empty the cache in the Cloudflare dashboard
(zone → **Caching** → **Configuration** → **Purge Everything**) and reload.

---

## If something goes wrong

**Roll back.** Cloudflare keeps previous versions of the Worker:

```bash
npx wrangler deployments list
npx wrangler rollback
```

`rollback` returns the site to the previous version in seconds. Do that first, then work
out what happened.

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

---

## Things this file deliberately does not do

- **It does not deploy anything.** Running `pnpm deploy` is your decision, at step 6.
- **It does not add routes or custom domains to `wrangler.jsonc`.** Attaching the domain
  through the dashboard (step 7) keeps DNS, the certificate and the route as one
  operation Cloudflare manages. Hard-coding a route in the config file means the repo has
  an opinion about which domain it lives on, which makes a staging deploy awkward.
- **It never asks anyone to send a secret in a message.** If someone asks you to paste an
  API key into a chat, that is the wrong process regardless of who is asking.
