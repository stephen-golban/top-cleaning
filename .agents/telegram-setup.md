# Quote requests on Telegram — setup

> ## ✅ Done — this is live as of 2026-09-02
>
> Nothing on this page needs doing again. It is kept as the record of how it was set
> up, and as the instructions for redoing it if the bot is ever replaced.
>
> | Thing | Value |
> | --- | --- |
> | Bot | **@TopCleaningMD_Bot** ("TopCleaning") |
> | Delivers to | chat id **`5127988710`** — Ștefan, @ste_ghj, private chat |
> | Live since | Worker version `ada1deb5-1843-4094-8273-1229d94a137a` |
> | Verified | three real submissions through the live form, in `ro`, `ru` and `en` |
>
> **The tappable phone number works.** This was the one thing that could not be checked
> without a real send, and it has now been checked: Telegram returns a `phone_number`
> entity over the `+373…` number on every one of the three test messages, so tapping
> the `Telefon:` line offers to call. The `<code>` tap-to-copy fallback that was written
> down as a contingency is not needed and was not used.
>
> Three messages marked as a test are sitting in the chat from that verification. They
> use the company's own number, `079 022 023`. Delete them whenever you like.

When somebody fills in the form on topcleaning.md, the request arrives as a Telegram
message on your phone. The message contains the service they picked, what they wrote,
and their phone number — **and the phone number is tappable, so you call back in one
tap.**

This page sets that up. It takes about fifteen minutes, once. You do not need to be a
programmer. Every command is written out in full; type them in a Terminal window opened
inside the project folder.

---

## Before you start — one thing to know

A Telegram bot **cannot send a message to somebody who has never messaged it first.**
That is Telegram's rule, not ours, and there is no way around it.

So the setup has two halves that both have to happen:

1. You create the bot and get its **token** — the bot's password.
2. You send the bot `/start` from your own Telegram, and then read back your **chat id**
   — the number that says *which* Telegram account the messages go to.

### About `079 022 023`

That number is the business number printed on the website, and it is not part of this
setup. **A phone number cannot be used to address a Telegram message from a bot.**
Telegram delivers to a numeric *chat id*, which looks like `812345678`, and the only way
to get one is the `/start` step below. If someone tells you to "just put the phone number
in", it will not work.

`079 022 023` is public information on the website. It is not a password, and nothing on
this page needs it.

---

## Step 1 — Create the bot

1. Open Telegram and search for **@BotFather**. It is the official Telegram account for
   making bots; it has a blue verified check.
2. Open it and press **START**.
3. Send: `/newbot`
4. BotFather asks for a **name**. This is what shows at the top of the chat. Send:

   ```
   Top Cleaning
   ```

5. BotFather asks for a **username**. It has to end in `bot` and has to be unused, so
   try something like:

   ```
   topcleaning_md_bot
   ```

   If it is taken, add a digit and try again.

6. BotFather replies with a message containing a line like:

   ```
   123456789:AAH9xK-abcdefghijklmnopqrstuvwxyz012
   ```

   **That is the token.** It is the bot's password. Anyone who has it can send messages
   as your bot and read the quote requests. Treat it like a bank card PIN.

> **Do not paste that token into a chat window, an email, or a WhatsApp message** — not
> even to your developer. Put it in a file, as the next step describes, or send it
> through a password manager.

---

## Step 2 — Put the token in a file

In the project folder there is a file called `.dev.vars`. If it does not exist, create
it. It is never uploaded to GitHub.

Add this line, with your real token between the quotes:

```
TELEGRAM_BOT_TOKEN="123456789:AAH9xK-abcdefghijklmnopqrstuvwxyz012"
```

Save the file.

> **It must be `.dev.vars`, not `.env.local`.** They look interchangeable and they are
> not. Next reads `.env.local` while it *builds*, and the build result — token included
> — gets uploaded to Cloudflare inside the site's own code, where anyone with access to
> the account can read it. That happened once, on 2026-09-02, and was caught and
> cleaned up the same day. `.dev.vars` is read only when the site runs on your own
> machine and is never uploaded. `pnpm deploy` now refuses to publish a build with a
> secret in it, so a slip here is a failed deploy rather than a leak.

---

## Step 3 — Send `/start` to your new bot

**This step is mandatory. Skipping it means nothing will ever arrive.**

1. In Telegram, search for the username you chose (e.g. `@topcleaning_md_bot`).
2. Open the chat and press **START** at the bottom. (If there is no button, send the
   word `/start` as a normal message.)
3. The bot will not answer. That is expected — it has nothing to say yet. What matters is
   that Telegram now knows your account is allowed to receive its messages.

Do this **from the phone or account that should get the quote requests.** If two people
should get them, see *Sending to a group* at the bottom.

---

## Step 4 — Read back your chat id

In the Terminal, inside the project folder, run:

```bash
pnpm telegram:chat-id
```

It reads the token out of `.dev.vars` — so you never type it on the command line — and
prints something like:

```
────────────────────────────────────────────────────────────────────────
  TELEGRAM_CHAT_ID="812345678"    Ion Popescu @ionpopescu — private
────────────────────────────────────────────────────────────────────────
```

Copy that whole `TELEGRAM_CHAT_ID="…"` line into `.dev.vars`, underneath the token line.
`.dev.vars` now has two lines:

```
TELEGRAM_BOT_TOKEN="123456789:AAH9xK-abcdefghijklmnopqrstuvwxyz012"
TELEGRAM_CHAT_ID="812345678"
```

**If it says "Telegram has no messages for this bot":** step 3 did not happen, or it
happened more than 24 hours ago. Telegram throws these records away after a day, and
reading them once clears them. Just send the bot another message — anything, `hello` will
do — and run the command again.

<details>
<summary>Doing it by hand, without the command</summary>

The command is a convenience. The underlying thing is a web address. Open this in a
browser, with your real token in place of `<TOKEN>`:

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

You get a wall of JSON. Look for `"chat":{"id":812345678,` — that number is the chat id.
It is what `result[].message.chat.id` means.

Prefer `pnpm telegram:chat-id`: pasting a token into a browser address bar puts it in
your browser history and possibly into a synced-across-devices autocomplete.

</details>

---

## Step 5 — Send the two secrets to the live site

`.dev.vars` only affects your own computer. The live website is on Cloudflare and needs
its own copy. Run these two commands, one at a time:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
```

It asks you to paste a value. Paste the token (the long `123456789:AAH…` string) and
press Enter. Nothing appears on screen as you paste — that is deliberate.

```bash
wrangler secret put TELEGRAM_CHAT_ID
```

Paste the chat id (`812345678`) and press Enter.

Then publish the site so the change goes live:

```bash
pnpm deploy
```

---

## Step 6 — Test it, properly

Do not trust it until a real submission has arrived.

1. Open <https://topcleaning.md/ro/contact> on your phone.
2. Fill the form in as a customer would. Pick a service, write a sentence, and use a real
   phone number you can answer.
3. Wait a few seconds after pressing send — do not fill it out in under three seconds, or
   the site's spam filter will discard it as a bot.
4. Your Telegram should show a message that looks like:

   ```
   Cerere de ofertă — topcleaning.md

   Serviciu: Curățenie generală
   Telefon: +37379022023
   Scris de vizitator: 079 022 023
   Limba formularului: ro
   Trimis: 2026-09-01T09:30:00.000Z

   Detalii:
   Apartament cu 2 camere, după reparație.
   ```

5. **Tap the number on the `Telefon:` line.** Telegram should offer to call it. That is
   the whole point — check it works.

### If nothing arrives

The website tells the visitor the truth rather than pretending: if delivery failed, the
form shows a "could not be sent" panel with the phone number and WhatsApp link instead of
a thank-you. So a customer is never silently lost.

To see why, look at the Worker log:

```bash
wrangler tail
```

Then submit the form again and watch. You are looking for a line starting
`[quote] UNDELIVERED`. The rest of that line says what went wrong, and it contains the
full submission — so even a failed request is recoverable from the log.

Common causes:

| What the log says | What it means |
|---|---|
| `no delivery provider configured` | Step 5 did not happen, or the deploy in step 5 did not run. |
| `telegram responded 401` | The token is wrong. Copy it from BotFather again. |
| `telegram responded 400: … chat not found` | The chat id is wrong, or step 3 (`/start`) never happened. |
| `telegram responded 403: … bot was blocked by the user` | You blocked the bot in Telegram. Unblock it. |

---

## Day-to-day

- **Nothing to maintain.** The bot has no server of its own and costs nothing.
- **Do not delete the chat with the bot in Telegram.** Deleting the chat can revoke its
  permission to message you, and quotes stop arriving.
- **If the token ever leaks**, send `/revoke` to @BotFather, pick the bot, and it issues a
  new token. Then redo steps 2 and 5 with the new one.

### Sending to a group instead of one person

If more than one person should see quote requests:

1. Make a Telegram group and add your bot to it.
2. Send any message in the group (e.g. `/start@topcleaning_md_bot`).
3. Run `pnpm telegram:chat-id` again. The group appears as a second line, with a chat id
   that starts with a minus sign, like `-1002233445566`.
4. Use that as `TELEGRAM_CHAT_ID` and redo step 5.

By default a bot in a group only sees messages addressed to it, which is fine — it only
needs to send.

### Going back to email later

Email delivery (Resend) is still written and still works; it simply has no API key. If you
ever want email instead, remove the two Telegram secrets and set `RESEND_API_KEY` and
`QUOTE_NOTIFY_EMAIL`. When both are configured, **Telegram wins** and no email is sent.

---

## For a developer

- The provider lives in `src/components/forms/quote/delivery.ts` behind the one-method
  `QuoteDelivery` interface. Selection order: Telegram, then Resend, then the honest
  "undelivered" path.
- Runtime secrets live in `.dev.vars` locally and in `wrangler secret put` on
  Cloudflare — **never** in `.env.local`, which Next reads at build time and OpenNext
  bundles into the uploaded Worker. `pnpm deploy` enforces this via
  `scripts/check-build-env.mjs`. `pnpm dev` therefore cannot deliver; use `pnpm preview`,
  which runs workerd and reads `.dev.vars`.
- Messages use Telegram's `HTML` parse mode, escaping `&`, `<`, `>`. MarkdownV2 was
  rejected: it requires escaping eighteen characters, several of which (`.`, `-`, `(`,
  `)`) appear in ordinary prose and in every phone number.
- The number is sent as bare E.164 text rather than a `tel:` link, because Telegram's
  servers auto-detect an international number into a tappable `phone_number` entity while
  a `tel:` anchor is rejected by Telegram's URL scheme allowlist. **Confirmed against
  real sends on 2026-09-02**: every one of the three live test messages comes back with
  a `phone_number` entity over `+37379022023`. To re-check after any change to
  `formatTelegramMessage`, forward the message within the chat and read
  `Message.entities` off the `forwardMessage` response — the bot API cannot read back
  its own outbound messages any other way, and `getUpdates` never shows them.
- Messages are clamped to Telegram's 4096-code-unit limit without splitting an HTML
  entity — escaping can grow one character into five, so a 2000-character details field
  can exceed the limit.
- The token is in the request *path*, so every error string is passed through a redactor
  before it reaches a log. Covered by `src/components/forms/quote/delivery.test.mts`.
