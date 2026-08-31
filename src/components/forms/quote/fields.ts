import { serviceIds, type ServiceId } from "@/content";

/**
 * The quote form, as data.
 *
 * Three visible fields and nothing else. The old site had no form at all and
 * converted entirely on tap-to-call, so every field added here is a field that
 * has to earn its place against a phone number that already works — which is
 * why there is no name field, no email field and no preferred-date picker.
 * A phone number and a sentence about the space is everything needed to call
 * someone back with a price.
 */

/** `name` attributes. Shared by the form markup and the server action. */
export const FIELD = {
  service: "service",
  details: "details",
  phone: "phone",
  /** The locale the request was written in, so the reply is in that language. */
  locale: "locale",
  /**
   * Honeypot. Named like something a form-filling bot wants to complete and
   * hidden from people; any value at all means the submission is not human.
   */
  honeypot: "company",
  /**
   * Milliseconds since the epoch, written by the browser when the form mounts.
   * Empty when JavaScript never ran — see `TIMING` below.
   */
  startedAt: "elapsed",
} as const;

/** Fields a person can get wrong. */
export type QuoteFieldName = "service" | "details" | "phone";

/**
 * Keys under the `form.errors` message namespace. The server returns keys, not
 * sentences: the action has no business knowing which of three languages the
 * page it is answering was rendered in.
 */
export type QuoteErrorKey = "phone" | "phoneFormat" | "message";

export type QuoteValues = {
  service: string;
  details: string;
  phone: string;
};

export const EMPTY_VALUES: QuoteValues = { service: "", details: "", phone: "" };

export type QuoteErrors = Partial<Record<QuoteFieldName, QuoteErrorKey>>;

/**
 * What the server action hands back.
 *
 * `failed` is deliberately distinct from `invalid`: one means "fix this and try
 * again", the other means "we could not deliver it, here is a phone number".
 * Collapsing them would make an outage look like the visitor's mistake.
 */
export type QuoteState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "invalid"; errors: QuoteErrors; values: QuoteValues }
  | { status: "failed"; values: QuoteValues };

export const INITIAL_STATE: QuoteState = { status: "idle" };

/** The select's `value` for "none of the four". */
export const OTHER_SERVICE = "other";

export type ServiceChoice = ServiceId | typeof OTHER_SERVICE;

export function isServiceChoice(value: string): value is ServiceChoice {
  return value === OTHER_SERVICE || (serviceIds as readonly string[]).includes(value);
}

export const LIMITS = {
  detailsMin: 3,
  detailsMax: 2000,
  phoneMax: 32,
} as const;

/**
 * Anti-spam thresholds. No CAPTCHA: a cleaning company in Chișinău does not get
 * enough traffic to justify making every real visitor solve a puzzle, and the
 * cost of a false negative here is one junk email.
 */
export const TIMING = {
  /**
   * Nobody reads three fields and types a phone number in under this. The
   * check only runs when the browser actually wrote a timestamp, so a visitor
   * without JavaScript is never blocked by it — the honeypot covers that path.
   */
  minElapsedMs: 2_500,
  /** A form left open overnight is fine; a replayed timestamp from last week is not. */
  maxElapsedMs: 12 * 60 * 60 * 1_000,
} as const;

/** Link-stuffed "enquiries" are the one spam shape this form actually attracts. */
const URL_PATTERN = /\bhttps?:\/\/|\bwww\.|\[url[=\]]/gi;
const MAX_LINKS = 1;

export function looksLikeSpamContent(details: string): boolean {
  return (details.match(URL_PATTERN) ?? []).length > MAX_LINKS;
}

/**
 * Digits only, plus a leading `+`.
 *
 * Deliberately permissive about *shape*: Moldovan numbers get written as
 * `079 022 023`, `0 79 02 20 23`, `+373 79 022 023` and `00373...`, and a form
 * that rejects any of those is a form that loses the job. It checks that there
 * is a plausible quantity of digits and nothing else.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();

  // Digits, plus the punctuation people actually write numbers with: spaces,
  // dots, parentheses and every dash Unicode offers. Anything else — a letter,
  // an @, a URL — is not a phone number.
  if (!/^\+?[\d\s.()‐-―-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 8 || digits.length > 15) return null;

  // Local Moldovan form (0xxxxxxxx) → E.164, so every stored number looks alike.
  if (/^0\d{8}$/.test(digits)) return `+373${digits.slice(1)}`;
  return `+${digits}`;
}

export type QuoteValidation =
  | { ok: true; values: QuoteValues; phoneE164: string; service: ServiceChoice | null }
  | { ok: false; errors: QuoteErrors };

/**
 * The single validation pass, shared by the server action and (should it ever
 * be wanted) the client. It returns message *keys*, never sentences.
 */
export function validateQuote(values: QuoteValues): QuoteValidation {
  const errors: QuoteErrors = {};

  const details = values.details.trim();
  if (details.length < LIMITS.detailsMin || details.length > LIMITS.detailsMax) {
    errors.details = "message";
  }

  const phone = values.phone.trim();
  let phoneE164: string | null = null;
  if (phone.length === 0) {
    errors.phone = "phone";
  } else if (phone.length > LIMITS.phoneMax) {
    errors.phone = "phoneFormat";
  } else {
    phoneE164 = normalizePhone(phone);
    if (phoneE164 === null) errors.phone = "phoneFormat";
  }

  if (Object.keys(errors).length > 0 || phoneE164 === null) {
    return { ok: false, errors };
  }

  const service = values.service.trim();

  return {
    ok: true,
    values: { service, details, phone },
    phoneE164,
    service: isServiceChoice(service) ? service : null,
  };
}

/** The order fields appear in, which is the order errors are announced in. */
export const FIELD_ORDER: readonly QuoteFieldName[] = ["service", "details", "phone"];
