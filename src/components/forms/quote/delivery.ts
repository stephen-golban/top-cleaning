import type { Locale } from "@/i18n/routing";
import type { ServiceChoice } from "./fields";

/**
 * Getting a quote request to a human.
 *
 * Delivery is an interface with one method, and the provider is chosen at
 * runtime from environment variables. Swapping providers — Telegram, Resend,
 * Postmark, a webhook — is a new object in this file and nothing else: the
 * action, the form and the pages do not know a provider exists.
 *
 * Two providers ship today. Telegram is the one the client actually uses: a
 * quote arrives as a push notification on the phone he already carries, with
 * the visitor's number tappable, so answering is one tap rather than an inbox
 * round trip. Resend was written first, was never given an API key, and is kept
 * because it costs nothing to keep and email may still be wanted later.
 *
 * Everything here runs on Cloudflare Workers: `fetch` only, no `node:` builtins.
 */

export type QuoteSubmission = {
  /** Exactly as the visitor typed it. */
  phone: string;
  /** E.164, for pasting into a dialler. */
  phoneE164: string;
  /** `null` when the visitor did not pick one — the field is optional. */
  service: ServiceChoice | null;
  /** The service's name in the visitor's language, for the notification body. */
  serviceName: string | null;
  details: string;
  /** Which language the visitor was reading. Reply in this one. */
  locale: Locale;
  submittedAt: Date;
};

export interface QuoteDelivery {
  /** For logs. Never shown to a visitor. */
  readonly name: string;
  /** Resolves when the notification is accepted; throws when it is not. */
  send(submission: QuoteSubmission): Promise<void>;
}

export type DeliveryResolution =
  | { configured: true; delivery: QuoteDelivery }
  | { configured: false; missing: readonly string[] };

/**
 * Resend's default sender. It works without any DNS setup, which is what makes
 * a first deploy possible, but it only delivers to the address that owns the
 * Resend account — production wants `QUOTE_FROM_EMAIL` on a verified domain.
 */
const DEFAULT_FROM = "Top Cleaning <onboarding@resend.dev>";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Telegram's hard cap on a text message, counted in UTF-16 code units — which
 * is what `String.prototype.length` counts, so the two agree. The details field
 * allows 2000 characters and HTML-escaping can grow one character into five
 * (`&` → `&amp;`), so a hostile submission reaches this ceiling easily.
 */
const TELEGRAM_MAX_MESSAGE = 4096;

/** A slow Telegram is a failed Telegram: the visitor is waiting on this. */
const TELEGRAM_TIMEOUT_MS = 10_000;

type Env = Record<string, string | undefined>;

function firstLine(submission: QuoteSubmission): string {
  return submission.serviceName ?? submission.phone;
}

export function formatQuoteText(submission: QuoteSubmission): string {
  return [
    `Serviciu:  ${submission.serviceName ?? "—"}`,
    `Telefon:   ${submission.phone}  (${submission.phoneE164})`,
    `Limba:     ${submission.locale}`,
    `Trimis:    ${submission.submittedAt.toISOString()}`,
    "",
    "Detalii:",
    submission.details,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Telegram                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Escape for Telegram's `HTML` parse mode.
 *
 * HTML mode over MarkdownV2 on purpose. MarkdownV2 requires escaping eighteen
 * different characters — `_ * [ ] ( ) ~ ` > # + - = | { } . !` — several of
 * which (`.`, `-`, `(`, `)`) appear in ordinary Romanian prose and in every
 * phone number a visitor types. One missed character is a 400 from Telegram and
 * a lost job. HTML mode has exactly three: `&`, `<`, `>`. Three is auditable.
 *
 * Telegram parses `&amp;`, `&lt;`, `&gt;` and `&quot;` only, so quotes are left
 * alone deliberately — escaping them would print `&quot;` literally.
 */
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Cut already-escaped text to `max` code units without splitting an entity.
 *
 * Slicing `&amp;` down the middle leaves a bare `&am`, which Telegram rejects
 * with "can't parse entities". So after cutting, a trailing `&` that has not
 * yet found its `;` is dropped along with everything after it.
 */
export function clampEscapedHtml(escaped: string, max: number): string {
  if (max <= 0) return "";
  if (escaped.length <= max) return escaped;

  const cut = escaped.slice(0, max);
  const lastAmp = cut.lastIndexOf("&");
  return lastAmp !== -1 && !cut.includes(";", lastAmp) ? cut.slice(0, lastAmp) : cut;
}

/**
 * The notification body, in Telegram `HTML` parse mode.
 *
 * The visitor's number appears once in bare E.164 form on its own line. That is
 * not a stylistic choice: Telegram's servers auto-detect a `+`-prefixed
 * international number in message text and turn it into a `phone_number`
 * entity, which is tappable straight into a call — the entire point of this
 * business. A `<a href="tel:…">` would be tidier to read but Telegram only
 * accepts a short list of URL schemes in anchors and rejects the rest with a
 * 400, so a link would trade a working call button for an undelivered message.
 */
export function formatTelegramMessage(submission: QuoteSubmission): string {
  const esc = escapeTelegramHtml;

  const header = [
    "<b>Cerere de ofertă — topcleaning.md</b>",
    "",
    `<b>Serviciu:</b> ${esc(submission.serviceName ?? "—")}`,
    // Bare, unformatted, on its own line: Telegram links it as a phone number.
    `<b>Telefon:</b> ${esc(submission.phoneE164)}`,
    `<b>Scris de vizitator:</b> ${esc(submission.phone)}`,
    `<b>Limba formularului:</b> ${esc(submission.locale)}`,
    `<b>Trimis:</b> ${esc(submission.submittedAt.toISOString())}`,
    "",
    "<b>Detalii:</b>",
    "",
  ].join("\n");

  const budget = TELEGRAM_MAX_MESSAGE - header.length;
  const details = esc(submission.details);
  if (details.length <= budget) return header + details;

  // Leave room for the marker so the owner knows the text was cut and can ring
  // the number for the rest, rather than silently reading half a request.
  const marker = "\n\n[…text scurtat]";
  return header + clampEscapedHtml(details, budget - marker.length) + marker;
}

/**
 * Remove the bot token from anything on its way to a log or an error message.
 *
 * The token lives in the request *path*, not a header, which is Telegram's
 * design and not ours — so any error that quotes a URL quotes the credential.
 * Every string this provider throws goes through here.
 */
function redactToken(text: string, botToken: string): string {
  return botToken.length > 0 ? text.split(botToken).join("<redacted>") : text;
}

/**
 * Telegram Bot API, over `sendMessage`. No SDK: one `fetch` is the integration.
 *
 * `apiBase` exists so tests can point the provider at a local stub server. It
 * is not read from the environment and has no production use.
 */
export function createTelegramDelivery(
  botToken: string,
  chatId: string,
  apiBase: string = TELEGRAM_API_BASE,
): QuoteDelivery {
  const endpoint = `${apiBase.replace(/\/+$/, "")}/bot${botToken}/sendMessage`;

  return {
    name: "telegram",
    async send(submission) {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
          body: JSON.stringify({
            chat_id: chatId,
            text: formatTelegramMessage(submission),
            parse_mode: "HTML",
            // A visitor is allowed one link before the spam filter bites; a
            // preview card for it would push the phone number off the screen.
            link_preview_options: { is_disabled: true },
          }),
        });
      } catch (error) {
        // Deliberately not re-thrown with `{ cause }`: a fetch failure's cause
        // can carry the request URL, and the request URL carries the token.
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`telegram request failed: ${redactToken(reason, botToken)}`);
      }

      // The body carries Telegram's reason (bad token, chat never started the
      // bot, unparseable entities). Server-side only; the visitor sees the
      // phone number instead.
      const body = await response.text().catch(() => "");

      if (!response.ok) {
        throw new Error(
          `telegram responded ${response.status}: ${redactToken(body, botToken).slice(0, 500) || "(no body)"}`,
        );
      }

      // Telegram uses HTTP status codes for failures, so this is belt and
      // braces — but a 200 with `ok: false` must never read as delivered.
      if (/"ok"\s*:\s*false/.test(body)) {
        throw new Error(
          `telegram responded 200 with ok:false: ${redactToken(body, botToken).slice(0, 500)}`,
        );
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Resend                                                                     */
/* -------------------------------------------------------------------------- */

/** Resend, over its REST API. No SDK: one `fetch` is the whole integration. */
function createResendDelivery(apiKey: string, to: string, from: string): QuoteDelivery {
  return {
    name: "resend",
    async send(submission) {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Cerere de ofertă — ${firstLine(submission)}`,
          text: formatQuoteText(submission),
        }),
      });

      if (!response.ok) {
        // The body carries Resend's reason (bad key, unverified domain, …).
        // It is server-side only; the visitor sees the phone number instead.
        const body = await response.text().catch(() => "");
        throw new Error(
          `resend responded ${response.status}: ${body.slice(0, 500) || "(no body)"}`,
        );
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Provider selection                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Pick a delivery provider from the environment, or say what is missing.
 *
 * Precedence is Telegram, then Resend. When both are configured Telegram wins,
 * deliberately: it is the channel the client asked for and the one he reads
 * within seconds, and sending to both would double every notification while
 * doubling the ways a submission can half-fail. The rule is fixed in code
 * rather than in a `QUOTE_DELIVERY=` switch so there is no third setting to get
 * wrong — deleting the Telegram secrets is how you fall back to email.
 *
 * Returning a discriminated union rather than throwing is the point: an
 * unconfigured site is an expected state, not an exception, and the caller has
 * a specific, useful thing to do about it.
 */
export function resolveQuoteDelivery(env: Env = process.env): DeliveryResolution {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();

  if (botToken && chatId) {
    return { configured: true, delivery: createTelegramDelivery(botToken, chatId) };
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.QUOTE_NOTIFY_EMAIL?.trim();
  const from = env.QUOTE_FROM_EMAIL?.trim() || DEFAULT_FROM;

  if (apiKey && to) {
    return { configured: true, delivery: createResendDelivery(apiKey, to, from) };
  }

  // Nothing is configured, or one provider is half-configured. Name every
  // variable that is absent, from both providers: the log line this feeds is
  // the only diagnostic anyone gets, and "which half did I forget" is the
  // question it has to answer.
  const missing: string[] = [];
  if (!botToken) missing.push("TELEGRAM_BOT_TOKEN");
  if (!chatId) missing.push("TELEGRAM_CHAT_ID");
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!to) missing.push("QUOTE_NOTIFY_EMAIL");

  return { configured: false, missing };
}
