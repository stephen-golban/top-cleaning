import type { Locale } from "@/i18n/routing";
import type { ServiceChoice } from "./fields";

/**
 * Getting a quote request to a human.
 *
 * The client has no email service configured yet, and might never pick Resend.
 * So delivery is an interface with one method, and the provider is chosen at
 * runtime from environment variables. Swapping Resend for Postmark, SES, a
 * Telegram bot or a webhook is a new object in this file and nothing else —
 * the action, the form and the pages do not know a provider exists.
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

/**
 * Pick a delivery provider from the environment, or say what is missing.
 *
 * Returning a discriminated union rather than throwing is the point: an
 * unconfigured site is an expected state during the client's first weeks, not
 * an exception, and the caller has a specific, useful thing to do about it.
 */
export function resolveQuoteDelivery(env: Env = process.env): DeliveryResolution {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.QUOTE_NOTIFY_EMAIL?.trim();
  const from = env.QUOTE_FROM_EMAIL?.trim() || DEFAULT_FROM;

  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!to) missing.push("QUOTE_NOTIFY_EMAIL");

  if (!apiKey || !to) return { configured: false, missing };

  return { configured: true, delivery: createResendDelivery(apiKey, to, from) };
}
