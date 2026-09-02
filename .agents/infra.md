# Infrastructure facts (verified in-session)

- GitHub: repo already exists and is wired as `origin` →
  `git@github.com:stephen-golban/top-cleaning.git` (account `stephen-golban`, SSH).
  `gh` CLI is authenticated.
- Cloudflare: `wrangler` is authenticated via OAuth as golban.stephen@gmail.com.
  - Account name: `Golban.stephen@gmail.com's Account`
  - Account ID: `b8348ba8b3e65b3b3dd2ad6324a280f6`
  - Token scopes include workers (write), workers_routes (write), workers_scripts (write),
    pages (write), zone (read), ssl_certs (write), kv (write), d1 (write).
  - NOTE: the OAuth token does NOT include a Cloudflare Stream scope. Confirmed against
    the live API on 2026-09-02, not just `wrangler whoami`: `/accounts/<id>/stream`
    returns `403 10000` with it. Stream upload and signing-key creation need an API token
    created in the dashboard (Stream:Edit + Account Settings:Read).
  - NOTE: that dashboard token must be **Account**-scoped on both permission rows, with
    `Account Resources` set to include this account. A token whose rows say `Zone` still
    reports `Stream: Edit` and still fails every Stream call with `403 10002`, because
    Stream lives at `/accounts/<id>/stream`. This is what blocked the video feature on
    2026-09-02. `pnpm video:stream doctor` tells the two cases apart.
- Canonical domain: `topcleaning.md` (from the old repo). NOTE: it currently does not resolve — the old site is down, so the repo is the only surviving source of content. Confirm the Cloudflare zone matches before wiring DNS.
