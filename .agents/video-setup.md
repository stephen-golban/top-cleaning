# Private videos — setup and day-to-day use

This is the runbook for the QR-code videos: the ones you film to show a client how the
work is done, that must not be findable on the internet.

You do not need to be a programmer to follow it. Every command is written out in full.
Type them in a Terminal window opened inside the project folder.

---

## How the privacy actually works

Three separate locks, so that failing one does not expose a video.

1. **The link is a secret.** A link looks like
   `https://topcleaning.md/ro/v/Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S`. That last part is 32
   random characters — about as guessable as a bank card PIN with 58 digits. Nobody
   finds it by trying.

2. **Cloudflare refuses to play the video without permission from our server.** Each
   video is marked *"require signed URLs"*. Even somebody who learned the video's real
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
hand a printed card to a client. It is not fine to post the picture of it on Facebook.

---

## Part 1 — One-time setup

Do this once. It takes about ten minutes.

### 1.1 Create a Cloudflare API token

1. Open <https://dash.cloudflare.com/profile/api-tokens>.
2. Click **Create Token**, then **Create Custom Token** → **Get started**.
3. Name it `top-cleaning-stream`.
4. Under **Permissions**, add these two rows:

   | | | |
   |---|---|---|
   | Account | Cloudflare Stream | **Edit** |
   | Account | Account Settings | **Read** |

5. Under **Account Resources**, choose **Include** → your account.
6. Click **Continue to summary** → **Create Token**.
7. Cloudflare shows the token **once**. Copy it now.

> The existing `wrangler` login does **not** have Stream permission. This new token is
> the only way to create signing keys and lock videos. Keep it in a password manager.

### 1.2 Put the token in `.env.local`

Create a file called `.env.local` in the project folder (it is never committed to git)
containing:

```
CF_ACCOUNT_ID="b8348ba8b3e65b3b3dd2ad6324a280f6"
CF_STREAM_API_TOKEN="paste-the-token-here"
```

Verify the account ID against the Cloudflare dashboard: it is shown on the right-hand
side of any account page.

### 1.3 Create the signing key

```bash
pnpm video:stream keys
```

This creates the key that signs the permission slips, and writes it into `.env.local`
and into a file called `stream-signing-key.pem`. **The private half is shown by
Cloudflare exactly once and can never be recovered** — copy both files into a password
manager now. If you lose the key, make a new one; every existing video keeps working,
they just get signed by the new key.

The command prints the key ID but never prints the private key. That is on purpose:
secrets belong in files, not on screens or in chat windows.

### 1.4 Tell the site which Cloudflare delivery address to use

Run this **after** you have uploaded at least one video (Part 2):

```bash
pnpm video:stream subdomain
```

Copy the line it prints into `.env.local`.

### 1.5 Send the secrets to the live site

```bash
wrangler secret put CF_STREAM_SIGNING_KEY_ID
wrangler secret put CF_STREAM_SIGNING_KEY_PEM < stream-signing-key.pem
wrangler secret put CF_STREAM_CUSTOMER_SUBDOMAIN
```

The first and third will ask you to paste a value; take them from `.env.local`.

`CF_ACCOUNT_ID` and `CF_STREAM_API_TOKEN` are **not** needed on the live site. They are
only used by the commands you run on your own computer. Leave them out of production —
fewer secrets on the server is strictly better.

---

## Part 2 — Adding a video

### 2.1 Upload it

Easiest: <https://dash.cloudflare.com> → **Stream** → **Videos** → **Upload video**, and
drag the file in. There is no size limit through the dashboard.

For a file under 200 MB you can also do it from the Terminal:

```bash
curl --request POST \
  --header "Authorization: Bearer $CF_STREAM_API_TOKEN" \
  --form file=@/Users/you/Desktop/my-video.mp4 \
  https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream
```

Wait for Cloudflare to finish processing — a minute or two for a short clip.

### 2.2 Lock it

```bash
pnpm video:stream list
```

Every video is listed with `LOCKED` or `PUBLIC ⚠` and its 32-character ID. A freshly
uploaded video is `PUBLIC`. Lock it:

```bash
pnpm video:stream lock ea95132c15732412d22c1476fa83f27a
```

Run `pnpm video:stream list` again and confirm it now says `LOCKED`. **Do not skip
this.** It is the lock that actually stops strangers.

### 2.3 Make a secret link

```bash
pnpm video:token
```

It prints a token, the three links that use it, and a block of text ready to paste.

### 2.4 Add it to the list of links

Open `src/lib/video/links.ts`. Inside the `videoLinks = [ ... ]` brackets, paste the
block the previous command printed and fill it in:

```ts
{
  token: "Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S",
  title: {
    ro: "Curățenie după reparație — metoda noastră",
    ru: "Уборка после ремонта — наш метод",
    en: "Post-renovation cleaning — our method",
  },
  clips: [{ uid: "ea95132c15732412d22c1476fa83f27a" }],
},
```

- `token` — from step 2.3.
- `uid` — the 32-character ID from step 2.2, **not** the filename.
- `title` — optional. Leave it out and the page uses a generic heading.
- `clips` — a list. Put several videos in it and the page shows a playlist:
  `clips: [{ uid: "aaa…" }, { uid: "bbb…" }]`. They play in the order written.
- `posterTime` — optional, e.g. `{ uid: "aaa…", posterTime: 12 }` picks the still image
  from 12 seconds in, when the first frame is a dark or empty shot.

Then publish:

```bash
pnpm deploy
```

### 2.5 Make the QR code

```bash
pnpm video:qr Zx7Q1s0oQ2mQF8N3yq2mVvJZQ0oJ1o1S
```

Two files land in a `qr-codes` folder:

- `.svg` — give this one to a printer. It stays sharp at any size.
- `.png` — 2048 pixels wide, for anything that will not take an SVG.

The code uses the highest error-correction level, so it still scans with a fingerprint,
a crease, or a coffee ring across it, and it has a wide white border — do not crop that
border away or phones will struggle.

For a Russian- or English-speaking client, add `--locale ru` or `--locale en`.

The `qr-codes` folder ignores itself in git, because those images contain the secret.

### 2.6 Test it before printing a hundred

Scan the code with your own phone. You should see the page, a still frame from the
video, and a play button. Tap it and the video plays.

Then test that the lock works: open the Cloudflare dashboard, copy the video's normal
preview link, and open it in a private browsing window. It must **fail**. If it plays,
step 2.2 did not take.

---

## Part 3 — Taking a link away

Delete its block from `src/lib/video/links.ts` and run `pnpm deploy`. The link stops
working within a minute. Any QR code already printed becomes a dead card — it goes to
the "link is no longer valid" page, which tells the visitor to call you.

The video itself stays in Cloudflare. To remove it entirely, delete it from the Stream
dashboard.

---

## Part 4 — When something is wrong

| What you see | What it means |
|---|---|
| "This link is no longer valid" on a link you just created | The site has not been deployed yet, or the token in `links.ts` does not exactly match the one in the QR. Run `pnpm deploy`. |
| The same message, and you are sure the token is right | The signing key is missing or wrong on the live site. Run `wrangler tail`, open the link again, and read the line starting `[video]`. |
| The page loads but the poster image is missing | The video is still processing, or `posterTime` is past the end of the video. |
| The page loads, the poster shows, playing fails | The video is probably not marked as requiring signed URLs, or was deleted. Run `pnpm video:stream list`. |
| `Cloudflare refused the request (HTTP 403)` | The API token is missing the **Stream: Edit** permission. Redo step 1.1. |
| A video plays for someone who never got a link | Check `pnpm video:stream list` — it is `PUBLIC`. Lock it. |

To check the signing setup without a browser:

```bash
pnpm video:stream check ea95132c15732412d22c1476fa83f27a
```

It prints a playback URL that works for the next couple of hours. If that URL plays, the
keys are right and the problem is elsewhere.

---

## For a developer picking this up later

- `src/lib/stream.ts` — signs RS256 playback JWTs with Web Crypto (no `node:crypto`; this
  runs on the Workers runtime). Handles Cloudflare's base64-wrapped PEM.
- `src/lib/video/tokens.ts` — token generation and constant-time lookup (double HMAC).
- `src/lib/video/catalog.ts` — validates and merges `links.ts` with `PRIVATE_VIDEO_LINKS`.
- `src/lib/video/playback.ts` — the server/client boundary. Video UIDs stop here.
- `src/app/[locale]/v/[token]/` — the page. `force-dynamic`, `noindex`, 404s identically
  for unknown, malformed, revoked and misconfigured links so it cannot be used as an
  oracle.
- `src/app/robots.ts` — disallows `/v/`.
- Tests: `pnpm test` (Node's built-in runner; 53 assertions, no Cloudflare needed —
  the JWT tests generate their own RSA keypair and verify the signature).

`PRIVATE_VIDEO_LINKS` is an escape hatch: the same JSON as `links.ts`, set as a Worker
secret, for adding or revoking a link without touching code. Entries there win over
entries in the file.

**Anyone adding a `sitemap.ts` must leave `/v/` out of it.** There is no automatic guard.
