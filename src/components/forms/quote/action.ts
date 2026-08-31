"use server";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { serviceById } from "@/content";
import { defaultLocale, routing } from "@/i18n/routing";
import {
  FIELD,
  looksLikeSpamContent,
  TIMING,
  validateQuote,
  type QuoteState,
  type QuoteValues,
} from "./fields";
import {
  formatQuoteText,
  resolveQuoteDelivery,
  type QuoteSubmission,
} from "./delivery";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Honeypot plus a timing check, in place of a CAPTCHA.
 *
 * The timestamp is written by the browser when the form mounts, so it is
 * missing whenever JavaScript did not run. That case is treated as "no signal"
 * rather than as "suspicious": blocking it would break the progressive
 * enhancement the rest of this form is built around, and the honeypot already
 * covers a naive scripted POST.
 */
function looksAutomated(formData: FormData): string | null {
  if (readString(formData, FIELD.honeypot).trim().length > 0) return "honeypot";

  const startedAt = Number.parseInt(readString(formData, FIELD.startedAt), 10);
  if (Number.isFinite(startedAt)) {
    const elapsed = Date.now() - startedAt;
    if (elapsed < TIMING.minElapsedMs) return "too-fast";
    if (elapsed > TIMING.maxElapsedMs) return "stale";
  }

  return null;
}

/**
 * The quote request.
 *
 * Written as a Server Action rather than a route handler so the form works with
 * JavaScript switched off: React posts it, this runs, and the page comes back
 * with either the success panel or the errors already rendered. `useActionState`
 * on the client upgrades that to an in-place update without a navigation.
 */
export async function submitQuote(
  _previous: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const values: QuoteValues = {
    service: readString(formData, FIELD.service),
    details: readString(formData, FIELD.details),
    phone: readString(formData, FIELD.phone),
  };

  const rawLocale = readString(formData, FIELD.locale);
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : defaultLocale;

  // Bots are told the same thing a person is. Telling them they were caught
  // just teaches whoever wrote them which field to leave alone next time.
  const automated = looksAutomated(formData);
  if (automated) {
    console.warn(`[quote] discarded a submission: ${automated}`);
    return { status: "success" };
  }

  const result = validateQuote(values);
  if (!result.ok) {
    return { status: "invalid", errors: result.errors, values };
  }

  if (looksLikeSpamContent(result.values.details)) {
    console.warn("[quote] discarded a submission: links");
    return { status: "success" };
  }

  const t = await getTranslations({ locale, namespace: "form" });
  const serviceName =
    result.service === null
      ? null
      : result.service === "other"
        ? t("service.other")
        : serviceById[result.service].name[locale];

  const submission: QuoteSubmission = {
    phone: result.values.phone,
    phoneE164: result.phoneE164,
    service: result.service,
    serviceName,
    details: result.values.details,
    locale,
    submittedAt: new Date(),
  };

  const resolution = resolveQuoteDelivery();

  if (!resolution.configured) {
    // No email provider yet. The submission is written to the server log in
    // full so it is recoverable, and the visitor is told plainly that it did
    // not go through — never a success panel over a request nobody received.
    console.error(
      `[quote] UNDELIVERED — no delivery provider configured (missing: ${resolution.missing.join(", ")})\n${formatQuoteText(submission)}`,
    );
    return { status: "failed", values: result.values };
  }

  try {
    await resolution.delivery.send(submission);
  } catch (error) {
    console.error(
      `[quote] UNDELIVERED — provider "${resolution.delivery.name}" failed: ${error instanceof Error ? error.message : String(error)}\n${formatQuoteText(submission)}`,
    );
    return { status: "failed", values: result.values };
  }

  return { status: "success" };
}
