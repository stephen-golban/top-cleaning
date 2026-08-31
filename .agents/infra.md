# Infrastructure facts (verified in-session)

- GitHub: repo already exists and is wired as `origin` →
  `git@github.com:stephen-golban/top-cleaning.git` (account `stephen-golban`, SSH).
  `gh` CLI is authenticated.
- Cloudflare: `wrangler` is authenticated via OAuth as golban.stephen@gmail.com.
  - Account name: `Golban.stephen@gmail.com's Account`
  - Account ID: `b8348ba8b3e65b3b3dd2ad6324a280f6`
  - Token scopes include workers (write), workers_routes (write), workers_scripts (write),
    pages (write), zone (read), ssl_certs (write), kv (write), d1 (write).
  - NOTE: the OAuth token does NOT include a Cloudflare Stream scope. Stream upload and
    signing-key creation will need an API token created in the dashboard
    (Stream:Edit + Account Settings:Read). Do not block on this — build against env vars.
- Canonical domain: `topcleaning.md` (from the old repo). NOTE: it currently does not resolve — the old site is down, so the repo is the only surviving source of content. Confirm the Cloudflare zone matches before wiring DNS.
