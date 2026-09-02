# Private client videos — setup and day-to-day use

This is the runbook for the QR-code videos: the ones you film to show a client how the
work is done, that must not be findable on the internet.

You do not need to be a programmer to follow it. Every command is written out in full.
Open a Terminal window, go to the project folder, and type them there.

Steps 1–9 are the first video, start to finish, in order. Do them once. Adding a second
video later is only steps 5–9, and takes about five minutes.

---

## Where this stands right now (2026-09-02)

**Nothing is live yet, and the reason is step 1.**

| Step | State |
| ---- | ----- |
| 1. API token | ✗ **Redo it.** A token exists in `.dev.vars` and Cloudflare accepts it, but its permissions were granted on **zones** instead of on the **account**. Cloudflare's Stream API lives at `/accounts/<id>/stream`, so the token cannot reach it: every Stream call comes back `403 Authorization Failure`. Run `pnpm video:stream doctor` to see this for yourself, then redo step 1. |
| 2. Token in `.dev.vars` | ✓ done — the file and the variable name are correct |
| 3–9 | ⏸ blocked on step 1. No signing key exists, no video is uploaded, no link is registered, no QR code has been made. `wrangler secret list` shows no `CF_STREAM_*` secret. |

`/v/<anything>` on the live site therefore shows "this link is no longer valid", which is
the correct behaviour for a site with no videos registered. The rest of the site is
unaffected.

The code around all of this **is** finished and deployed, including the change that made
`links.ts` safe to have in a public repository (see step 8). When the token is fixed,
steps 3–9 are about fifteen minutes of typing.

---

## Before anything: where each value goes

There are four Cloudflare values in this system and they do **not** all live in the same
place. Putting one in the wrong file is how a credential gets published, so this table is
the most important thing on the page.

| Value                       | What it is                        | Where it goes                              |
| --------------------------- | --------------------------------- | ------------------------------------------ |
| `CF_ACCOUNT_ID`             | Which Cloudflare account. Not secret | Nowhere — already built into the scripts |
| `CF_STREAM_API_TOKEN`       | Lets **your computer** manage videos | `.dev.vars` only                        |
| `CF_STREAM_SIGNING_KEY_ID`  | Which signing key **the website** uses | `.dev.vars` + `wrangler secret put`   |
| `CF_STREAM_SIGNING_KEY_PEM` | The signing key itself. **Very secret** | `.dev.vars` + `wrangler secret put`  |

Two rules follow from that table, and neither has an exception:

> ### 🚫 Never put any of these in `.env.local`
>
> `.env.local` looks like the obvious place for settings. It is a trap. When the site is
> built, Next reads `.env.local` and **copies what it finds into the website's own code**,
> which is then uploaded to Cloudflare. A key in `.env.local` is a key published inside
> the site's source, readable by anyone who can read the site's code — and it keeps
> working even after you delete the real secret.
>
> This is not hypothetical. It happened on 2026-09-02 with the Telegram bot token, which
> had to be revoked and replaced. `pnpm deploy` now refuses to publish if anything secret
> is in the bundle, but do not rely on the safety net. **Use `.dev.vars`.**

> ### 🚫 The website never gets `CF_STREAM_API_TOKEN`
>
> That token can upload, change and delete every video in the account. The website only
> ever needs to *sign permission slips*, which is what the signing key is for. So the
> token stays on your computer. Do not run `wrangler secret put CF_STREAM_API_TOKEN`.

`.dev.vars` is a plain text file in the project folder. It is ignored by git, it is never
uploaded, and it is never built into the site. It probably already exists — the Telegram
settings are in it. If it does not, just create it.

---

## How the privacy actually works

Three separate locks, so that failing one does not expose a video.

1. **The link is a secret.** A link looks like
   `https://topcleaning.md/ro/v/Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S`. That last part is 32
   random characters — about as guessable as a bank card PIN with 58 digits. Nobody
   finds it by trying.

   The website does not store that link. It stores a **hash** of it: a fingerprint
   that can confirm the link a visitor arrives with, and cannot be turned back into
   the link. This matters because the file the links live in,
   `src/lib/video/links.ts`, is on GitHub where anybody can read it. A token written
   there in plain text would be a published password — and it would take lock 2 down
   with it, because our own server signs playback for whoever brings a token it
   recognises. So the token goes on the QR code and in your password manager, and only
   its hash goes in the file. The code refuses to serve an entry that breaks this.

2. **Cloudflare refuses to play the video without permission from our server.** Each
   video is marked _"require signed URLs"_. Even somebody who learned the video's real
   ID cannot play it. When a client opens the secret link, our server signs a short
   permission slip and hands it to their phone.

3. **The permission slip expires.** Two hours by default. If a client forwards the page,
   screenshots the address bar, or a URL ends up in someone's browser history, it stops
   working the same afternoon. They would have to go back to the secret link — which is
   why the secret link is the thing to protect.

On top of that the page tells search engines not to index it, `robots.txt` blocks it, it
is left out of the sitemap, and no link anywhere on the website points to it. A crawler
has no path to it at all.

**What this means for you:** treat the QR code and the link like a key. It is fine to
hand a printed card to a client. It is not fine to post a picture of it on Facebook.

---

## Step 1 — Create the Cloudflare API token

The `wrangler` login the site already uses has **no** Stream permission, so it cannot do
any of this. You need one new token, once.

1. Open <https://dash.cloudflare.com/profile/api-tokens>.
2. Click **Create Token**.
3. Scroll to the bottom, to **Create Custom Token**, and click **Get started**.
   Do not pick one of the ready-made templates above it — none of them fits.
4. **Token name**: `top-cleaning-stream`.
5. Under **Permissions** you get rows of three dropdowns. Set up exactly two rows —
   click **+ Add more** to get the second one:

   | First dropdown | Second dropdown                       | Third dropdown |
   | -------------- | ------------------------------------- | -------------- |
   | **Account**    | **Stream** (may read "Cloudflare Stream") | **Edit**    |
   | **Account**    | **Account Settings**                  | **Read**       |

   Both first dropdowns say **Account**. If a row says _Zone_ or _User_, change it.

   > **This is the step that goes wrong.** A token whose rows say _Zone_ still shows
   > `Stream: Edit` in the summary, is accepted by Cloudflare, and works for zone
   > operations — and is completely useless here, because videos belong to the
   > *account*, not to a domain. The error it produces says only "Authorization
   > Failure", which reads like a missing permission rather than a misplaced one.
   > That exact mistake blocked this feature on 2026-09-02.

6. Under **Account Resources**, set the two dropdowns to **Include** and your account —
   `Golban.stephen@gmail.com's Account`. Do not leave it on _All accounts_.
7. Leave **Client IP Address Filtering** and **TTL** empty.
8. **Continue to summary**. It should read: _"Golban.stephen@gmail.com's Account -
   Account Settings:Read, Stream:Edit"_. If it says anything else, go back.
9. **Create Token**.
10. Cloudflare now shows the token **once and never again**. Copy it, and paste it
    straight into your password manager before you do anything else.

**Then check it before going any further:**

```bash
pnpm video:stream doctor
```

It prints one line per thing that can be wrong — is the token valid, does it cover
account `b8348ba8b3e65b3b3dd2ad6324a280f6`, does Stream answer — and never prints any
part of the token. Do not start step 3 until all three lines say `[ok]`.

---

## Step 2 — Put the token in `.dev.vars`

Open the file `.dev.vars` in the project folder with a text editor. (If there is no such
file, create one with exactly that name — the leading dot matters.)

Add this line, with the real token in place of the placeholder:

```
CF_STREAM_API_TOKEN="paste-the-token-here"
```

Save it. Leave any lines that were already in the file alone.

> ### How to handle the token safely
>
> - **Type or paste it into the file, in your own editor.** That is the whole job.
> - **Never paste the token into a chat with Claude or any other assistant.** Anything in
>   a chat window has left your machine and is stored somewhere you do not control.
> - **Never run a command containing the token inside a Claude Code session using `!`.**
>   A `!`-prefixed command runs on your machine, but the entire line — token included — is
>   written into the session transcript. That is exactly as bad as pasting it into the
>   chat. If a command has to contain a secret, run it in your own Terminal window,
>   outside any assistant.
> - **Do not `echo` it** to check it worked. Shell history keeps that line. To check it
>   worked, run `pnpm video:stream list` — if the token is good you get a list of videos.
>
> There is nothing else to configure. `CF_ACCOUNT_ID` is already built into the scripts.

---

## Step 3 — Create the signing key

This is the key the website uses to sign permission slips.

```bash
pnpm video:stream keys
```

It prints the key's ID and writes two files:

- `.dev.vars` — gets `CF_STREAM_SIGNING_KEY_ID` and `CF_STREAM_SIGNING_KEY_PEM` added
- `stream-signing-key.pem` — the same private key on its own, so it can be piped into
  `wrangler` in step 7

Both are ignored by git and neither is ever built into the site. The command prints the
key **ID** but never the key itself: secrets belong in files, not on screens.

> **Cloudflare shows a signing key's private half exactly once and can never show it
> again.** Copy both files into your password manager now. If you do lose it, it is not a
> disaster — make a new one with the same command and redo step 7. Every existing video
> keeps working; they just get signed by the new key.

---

## Step 4 — Upload the video and lock it

**Upload from the Terminal.** One command per file:

```bash
pnpm video:stream upload ~/Downloads/IMG_2549.MOV "Curatenie dupa reparatie"
```

It uploads the file with _"require signed URLs"_ already switched on, so the video is
never — not even for a second — playable by anyone who guesses its ID. Then it waits for
Cloudflare to finish encoding, reads the video back, and refuses to finish unless the lock
really is on. It prints the 32-character ID at the end. Files up to 200 MB go this way;
anything larger has to use the dashboard.

**Or upload from the dashboard**, at <https://dash.cloudflare.com> → **Stream** →
**Videos** → **Upload video**, dragging the file in. There is no size limit that way, but
a video uploaded from the dashboard arrives **unlocked**, and you must lock it yourself
with the command below.

**Lock it immediately.** A freshly uploaded video is public to anyone who knows its ID.
Nobody knows the ID yet, so there is no rush of seconds — but do not hand out any link,
or leave for the day, before this is done.

```bash
pnpm video:stream list
```

Every video is listed as `LOCKED` or `PUBLIC ⚠` next to its 32-character ID. Copy the ID
of the one you just uploaded and run:

```bash
pnpm video:stream lock ea95132c15732412d22c1476fa83f27a
```

That turns on `requireSignedURLs` — lock number 2 from the list above. Confirm it:

```bash
pnpm video:stream list
```

It must now say `LOCKED`. **Do not skip this check.** It is the lock that actually stops
strangers, and it is the one people forget. Check every video, one at a time — a single
`PUBLIC` line in that list is a video anyone can watch.

Keep those 32-character IDs; step 8 needs them.

---

## Step 5 — Find the delivery address

Now that a video exists, this works:

```bash
pnpm video:stream subdomain
```

It prints one line, like:

```
CF_STREAM_CUSTOMER_SUBDOMAIN="customer-a1b2c3d4e5f6.cloudflarestream.com"
```

Add that line to `.dev.vars` too. It is not a secret — it is just an address — but it is
a setting the live website reads, so it goes in `.dev.vars` with the others, never in
`.env.local`.

---

## Step 6 — Give the live site its two secrets

So far everything has been on your computer. These three commands hand the website what
it needs. Each one asks you to paste a value and does not show it as you type:

```bash
wrangler secret put CF_STREAM_SIGNING_KEY_ID
wrangler secret put CF_STREAM_SIGNING_KEY_PEM < stream-signing-key.pem
wrangler secret put CF_STREAM_CUSTOMER_SUBDOMAIN
```

- The first asks for the key ID — copy it from `.dev.vars` or from what step 3 printed.
- The second reads the key straight out of the file, so nothing is typed or shown.
- The third asks for the address from step 5. Optional, but do it: it is the form
  Cloudflare recommends.

> **No redeploy is needed.** A Worker secret is a runtime setting, not part of the code.
> Cloudflare records `wrangler secret put` as a new version marked `Source: Secret Change`
> — the same site, new secret — and switches to it by itself. It takes effect on the very
> next request. Do **not** run `pnpm deploy` for this.

Check what is set at any time with `wrangler secret list`. It prints the names only,
never the values. You should **not** see `CF_STREAM_API_TOKEN` or `CF_ACCOUNT_ID` in that
list; if you do, remove them with `wrangler secret delete <NAME>` — the site has no use
for them.

---

## Step 7 — Make the secret link

```bash
pnpm video:token --out qr-codes/curatenie.txt
```

Two values come out of this, and only one of them is a secret:

- **the token** — the link itself. It is written to the file you named, which is inside
  the gitignored `qr-codes` folder, and it is *not* printed on screen. Copy it into your
  password manager. (The command refuses to write to any path git would not ignore.)
- **the token hash** — a fingerprint of the token. It is printed, along with a block of
  text ready to paste in the next step. The hash is not secret and is safe in git.

Leave `--out` off and the token is printed on screen instead, which is fine at your own
desk and not fine inside a Claude Code session — anything printed there is written into
the transcript.

All three links (`ro`, `ru`, `en`) use the same token and open the same video.

---

## Step 8 — Register the link, then publish

Open `src/lib/video/links.ts`. Inside the `videoLinks = [ ... ]` brackets, paste the
block the previous command printed and fill it in:

```ts
{
  tokenHash: "n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg",
  title: {
    ro: "Curățenie după reparație — metoda noastră",
    ru: "Уборка после ремонта — наш метод",
    en: "Post-renovation cleaning — our method",
  },
  clips: [{ uid: "ea95132c15732412d22c1476fa83f27a" }],
},
```

- `tokenHash` — the **hash** printed by step 7, never the token. This file is committed
  to <https://github.com/stephen-golban/top-cleaning>, which is public: a token here is a
  password on the internet. If you paste one by mistake the site refuses the entry
  outright — the link 404s and a line starting `[video]` explains why in `wrangler tail` —
  so the failure is a dead link rather than a leaked video. Fix it by putting the hash in
  and generating a fresh token.
- `uid` — the 32-character ID from step 4, **not** the filename.
- `title` — optional. Leave it out and the page uses a generic heading.
- `clips` — a list. Put several videos in it and the page shows a playlist:
  `clips: [{ uid: "aaa…" }, { uid: "bbb…" }]`. They play in the order written.
- `posterTime` — optional, e.g. `{ uid: "aaa…", posterTime: 12 }` picks the still image
  from 12 seconds in, when the first frame is a dark or empty shot.

This one **is** a code change, so it does need a publish:

```bash
pnpm deploy
```

(Unlike step 6. Secrets need no redeploy; changing a file does.)

`pnpm deploy` checks the build for stray secrets before it uploads anything. If it stops
with _"the build bundled N non-public variable(s)"_, something ended up in `.env.local` —
move those lines into `.dev.vars`, delete them from `.env.local`, and run it again.
Nothing was uploaded.

---

## Step 9 — Make the QR code, then test it

```bash
pnpm video:qr --token-file qr-codes/curatenie.txt
```

(or `pnpm video:qr <TOKEN>` if you have the token to hand and are at your own Terminal —
`--token-file` exists so the secret never appears on a command line.)

Two files land in a `qr-codes` folder:

- `.svg` — give this one to a printer. It stays sharp at any size.
- `.png` — 2048 pixels wide, for anything that will not take an SVG.

The code uses the highest error-correction level, so it still scans with a fingerprint, a
crease, or a coffee ring across it, and it has a wide white border — do not crop that
border away or phones will struggle.

For a Russian- or English-speaking client, add `--locale ru` or `--locale en`.

The `qr-codes` folder ignores itself in git, because those images contain the secret.

**Now test it, before printing a hundred of them.** Two checks:

1. **The link works.** Scan the code with your own phone. You should get the page, a
   still frame from the video, and a play button. Tap it and the video plays.
2. **The lock works.** In the Cloudflare dashboard, open the video and copy its normal
   preview link. Open that in a private browsing window. It must **fail**. If it plays,
   step 4 did not take — run `pnpm video:stream list` and lock it.

The second check is the one worth doing properly. The first only proves the link works;
the second proves everyone else is shut out.

---

## Adding another video later

Steps 4, 7, 8 and 9 — upload and lock, make a token, register it and deploy, make the QR.
Steps 1, 2, 3, 5 and 6 were one-time setup and are already done.

## Taking a link away

Delete its block from `src/lib/video/links.ts` and run `pnpm deploy`. The link stops
working within a minute. Any QR code already printed becomes a dead card — it goes to the
"link is no longer valid" page, which tells the visitor to call you.

The video itself stays in Cloudflare. To remove it entirely, delete it from the Stream
dashboard.

---

## When something is wrong

| What you see                                                     | What it means                                                                                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "This link is no longer valid" on a link you just created         | The site has not been deployed yet, or the token in `links.ts` does not exactly match the one in the QR. Run `pnpm deploy`.                                   |
| The same message, and you are sure the token is right             | The signing key is missing or wrong on the live site. Run `wrangler tail`, open the link again, and read the line starting `[video]`. Redo step 6.            |
| The page loads but the poster image is missing                    | The video is still processing, or `posterTime` is past the end of the video.                                                                                 |
| The page loads, the poster shows, playing fails                   | The video is probably not marked as requiring signed URLs, or was deleted. Run `pnpm video:stream list`.                                                      |
| `CF_STREAM_API_TOKEN is not set`                                  | Step 2. The line is missing from `.dev.vars`, or you are in the wrong folder.                                                                                 |
| `Cloudflare refused the request (HTTP 403)`                       | Run `pnpm video:stream doctor`. Almost always the token's permission rows were set to **Zone** instead of **Account**, or **Account Resources** was left blank. Redo step 1. |
| "This link is no longer valid" and `wrangler tail` says `entry carries a plaintext token` | A token was pasted into `src/lib/video/links.ts` where the **hash** belongs. That file is public. Generate a fresh token (the pasted one must be considered burnt), put its `tokenHash` in the file, and redeploy. |
| `refusing to write a token to …: git would not ignore it`         | `pnpm video:token --out` was pointed somewhere git would commit. Use a path inside `qr-codes/`.                                                              |
| `⚠ .env.local defines N non-public variable(s)`                   | Something secret is in the file that gets published. Move those lines to `.dev.vars` and delete them from `.env.local`.                                       |
| `pnpm deploy` stops with "the build bundled N non-public variable" | The same thing, caught at the last moment. Nothing was uploaded. Fix `.env.local` and deploy again.                                                          |
| A video plays for someone who never got a link                    | Check `pnpm video:stream list` — it is `PUBLIC`. Lock it.                                                                                                     |

To check the signing setup without a browser:

```bash
pnpm video:stream check ea95132c15732412d22c1476fa83f27a
```

It prints a playback URL that works for the next couple of hours. If that URL plays, the
keys are right and the problem is elsewhere.

---

## For a developer picking this up later

Credential handling, since this is the part that has already gone wrong once:

- `scripts/stream.mjs` reads `.dev.vars` first, then `.env.local`, and writes **only** to
  `.dev.vars`. `process.loadEnvFile` does not overwrite what is already set, so the
  precedence is shell env > `.dev.vars` > `.env.local` and a stale `.env.local` can never
  win. `.env.local` is still read so an old checkout keeps working, and every non-public
  key found there is reported as a warning.
- `CF_ACCOUNT_ID` is a default constant in `scripts/stream.mjs` (also in
  `.agents/infra.md`). It is an identifier, not a credential; the environment still
  overrides it.
- `scripts/check-build-env.mjs` runs between `opennextjs-cloudflare build` and `deploy`
  and fails the deploy on any non-`NEXT_PUBLIC_*` key in
  `.open-next/cloudflare/next-env.mjs`. Verified against a planted
  `CF_STREAM_SIGNING_KEY_ID` in `.env.local`: the value really is copied into the bundle,
  and the check exits 1 before anything is uploaded.

The feature itself:

- `src/lib/stream.ts` — signs RS256 playback JWTs with Web Crypto (no `node:crypto`; this
  runs on the Workers runtime). Handles Cloudflare's base64-wrapped PEM.
- `src/lib/video/tokens.ts` — token generation, SHA-256 hashing, and constant-time
  lookup (double HMAC).
- `src/lib/video/catalog.ts` — validates and merges `links.ts` with `PRIVATE_VIDEO_LINKS`,
  and reduces both entry forms to one match key.
- `src/lib/video/playback.ts` — the server/client boundary. Video UIDs stop here.
- `src/app/[locale]/v/[token]/` — the page. `force-dynamic`, `noindex`, 404s identically
  for unknown, malformed, revoked and misconfigured links so it cannot be used as an
  oracle.
- `src/app/robots.ts` — disallows `/v/`.
- Tests: `pnpm test` (Node's built-in runner; no Cloudflare needed — the JWT tests
  generate their own RSA keypair and verify the signature).

`PRIVATE_VIDEO_LINKS` is an escape hatch: the same JSON as `links.ts`, set as a Worker
secret, for adding or revoking a link without touching code. Entries there win over
entries in the file. Because it is a secret rather than a public file, an entry there may
use `token` in plaintext as well as `tokenHash`; both reduce to the same match key, so a
plaintext entry can override a hashed one for the same link.

**Why `links.ts` stores a hash.** The repository is public. A token committed there is a
password published on the internet, and it does not merely defeat gate 1 — it defeats
gate 2 as well, because the Worker signs a playback JWT for anybody presenting a token it
recognises. `hashToken` (SHA-256, base64url) is unsalted and uniterated on purpose: a
`generateToken` token is 192 uniform random bits, so there is no dictionary to try and
nothing to precompute, and the hash runs once per catalog entry on the request path where
a slow KDF would be the wrong tool. `resolveVideoLink` hashes the URL's token once and
sweeps the precomputed keys with the existing double-HMAC compare, so the constant-time
property is unchanged. `catalog.ts` refuses any file entry carrying a plaintext `token`,
and `catalog.test.mts` asserts the shipped file has none.

**Anyone adding a `sitemap.ts` must leave `/v/` out of it.** There is no automatic guard.
