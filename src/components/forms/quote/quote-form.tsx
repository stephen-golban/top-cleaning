"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT } from "@/components/layout/contact";
import { AppLink, Button, ChatIcon, PhoneIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { submitQuote } from "./action";
import {
  FIELD,
  FIELD_ORDER,
  INITIAL_STATE,
  OTHER_SERVICE,
  type QuoteErrors,
  type QuoteFieldName,
  type QuoteValues,
} from "./fields";

/**
 * The one error colour on the site.
 *
 * It is a local constant rather than a design token because the locked palette
 * in `.agents/DECISIONS.md` has no danger colour, and validation is the only
 * place that needs one. 6.6:1 on white, so it passes AA at 12.5px — and it is
 * never the only signal: every error is also a sentence, an `aria-invalid`, and
 * an entry in the summary at the top of the form.
 */
const DANGER = "#B42318";

export type QuoteFormService = {
  /** The `ServiceId`, or `other`. */
  id: string;
  /** Already resolved into the visitor's language by the page. */
  name: string;
};

export type QuoteFormProps = {
  /**
   * The four services, named in the current locale. Passed in rather than
   * imported so the form stays a leaf: the page owns locale resolution.
   */
  services: readonly QuoteFormService[];
  className?: string;
};

const FIELD_CLASSES =
  "min-h-11 w-full rounded-sm border bg-ground px-3.5 py-2.5 text-[0.9375rem] text-ink " +
  "placeholder:text-ink-3 transition-colors duration-(--duration-base) " +
  "focus:border-accent";

function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3"
    >
      <path d="m4 6.5 4 4 4-4" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 flex-none text-accent"
    >
      <circle cx="8" cy="8" r="6.4" />
      <path d="m5.4 8.2 1.8 1.8 3.4-3.6" />
    </svg>
  );
}

/**
 * The quote form.
 *
 * A React Server Action does the work, so the form submits and reports errors
 * with JavaScript switched off — `useActionState` only upgrades that to an
 * in-place update. Native constraint validation is off (`noValidate`) on
 * purpose: the browser would otherwise interrupt with messages in *its*
 * language, which on this site is frequently not the language the visitor is
 * reading. Every message a visitor sees comes from `messages/*.json`.
 */
export function QuoteForm({ services, className }: QuoteFormProps) {
  const t = useTranslations("form");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(submitQuote, INITIAL_STATE);

  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errorId = (name: QuoteFieldName) => `${uid}-${name}-error`;

  const formRef = useRef<HTMLFormElement>(null);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The browser's own clock, written once the form is interactive. The server
  // uses it to spot a submission that arrived faster than a human can type;
  // when JavaScript never runs it stays empty and the check is skipped.
  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, []);

  // Move focus where the answer is: the first field that needs fixing, or the
  // panel that explains what happened. Without this a keyboard or screen-reader
  // user is left at the submit button with an announcement and no way back.
  useEffect(() => {
    if (state.status === "invalid") {
      const first = FIELD_ORDER.find((name) => state.errors[name]);
      if (!first) return;
      const element = formRef.current?.elements.namedItem(FIELD[first]);
      if (element instanceof HTMLElement) element.focus();
      return;
    }

    if (state.status === "success" || state.status === "failed") {
      statusRef.current?.focus();
    }
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "flex gap-3 rounded-sm border border-hairline bg-accent-tint p-5",
          className,
        )}
      >
        <CheckMark />
        <div>
          <p className="text-[1.0625rem] font-medium text-ink">{t("success.title")}</p>
          <p className="mt-1.5 text-body text-ink-2">{t("success.description")}</p>
        </div>
      </div>
    );
  }

  const errors: QuoteErrors = state.status === "invalid" ? state.errors : {};
  const values: QuoteValues =
    state.status === "invalid" || state.status === "failed"
      ? state.values
      : { service: "", details: "", phone: "" };

  const describedBy = (name: QuoteFieldName) =>
    errors[name] ? errorId(name) : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className={cn("grid", className)}
    >
      <input type="hidden" name={FIELD.locale} value={locale} />
      <input
        ref={startedAtRef}
        type="hidden"
        name={FIELD.startedAt}
        defaultValue=""
        suppressHydrationWarning
      />

      {/* Honeypot. Off-screen rather than `display:none`, which the cruder
          form-fillers know to skip, and out of the tab order and the
          accessibility tree so nobody who is not a bot ever meets it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={id(FIELD.honeypot)}>Company</label>
        <input
          id={id(FIELD.honeypot)}
          type="text"
          name={FIELD.honeypot}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {state.status === "invalid" ? (
        <div
          role="alert"
          className="mb-5 rounded-sm border-l-2 bg-surface px-4 py-3.5"
          style={{ borderLeftColor: DANGER }}
        >
          <p className="text-[0.9375rem] font-medium" style={{ color: DANGER }}>
            {t("errors.generic")}
          </p>
          <ul className="mt-1.5 grid gap-1">
            {FIELD_ORDER.filter((name) => errors[name]).map((name) => (
              <li key={name}>
                <a
                  href={`#${id(FIELD[name])}`}
                  className="text-ui text-ink-2 underline underline-offset-2 hover:text-ink"
                >
                  {t(`errors.${errors[name]!}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "failed" ? (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="mb-5 rounded-sm border-l-2 bg-surface px-4 py-3.5"
          style={{ borderLeftColor: DANGER }}
        >
          <p className="text-[0.9375rem] font-medium" style={{ color: DANGER }}>
            {t("error.title")}
          </p>
          <p className="mt-1 text-ui text-ink-2">{t("error.description")}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <AppLink
              href={CONTACT.phoneHref}
              variant="bare"
              className="tnum inline-flex items-center gap-2 text-ui font-medium text-ink hover:text-accent-strong"
            >
              <PhoneIcon size={15} />
              {CONTACT.phoneDisplay}
            </AppLink>
            <AppLink
              href={CONTACT.whatsappHref}
              variant="quiet"
              className="inline-flex items-center gap-2"
            >
              <ChatIcon size={15} />
              {tCommon("cta.whatsapp")}
            </AppLink>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5">
        <Field
          htmlFor={id(FIELD.service)}
          label={t("service.label")}
          note={t("optional")}
        >
          <div className="relative">
            <select
              id={id(FIELD.service)}
              name={FIELD.service}
              defaultValue={values.service}
              className={cn(
                FIELD_CLASSES,
                "appearance-none border-hairline-strong pr-10",
                // Grey the placeholder while it is the selected option, and
                // recolour the moment a real one is picked — no client state.
                "[&:has(option[value='']:checked)]:text-ink-3",
              )}
            >
              <option value="">{t("service.placeholder")}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
              <option value={OTHER_SERVICE}>{t("service.other")}</option>
            </select>
            <ChevronDown />
          </div>
        </Field>

        <Field
          htmlFor={id(FIELD.details)}
          label={t("message.label")}
          note={t("required")}
          error={errors.details ? t(`errors.${errors.details}`) : undefined}
          errorId={errorId("details")}
        >
          <textarea
            id={id(FIELD.details)}
            name={FIELD.details}
            rows={4}
            required
            defaultValue={values.details}
            placeholder={t("message.placeholder")}
            aria-invalid={errors.details ? true : undefined}
            aria-describedby={describedBy("details")}
            className={cn(FIELD_CLASSES, "resize-y")}
            style={errors.details ? { borderColor: DANGER } : undefined}
          />
        </Field>

        <Field
          htmlFor={id(FIELD.phone)}
          label={t("phone.label")}
          note={t("required")}
          error={errors.phone ? t(`errors.${errors.phone}`) : undefined}
          errorId={errorId("phone")}
        >
          <input
            id={id(FIELD.phone)}
            name={FIELD.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            defaultValue={values.phone}
            placeholder={t("phone.placeholder")}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy("phone")}
            className={cn(FIELD_CLASSES, "tnum")}
            style={errors.phone ? { borderColor: DANGER } : undefined}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={pending}
          className="w-full min-[480px]:w-auto"
        >
          {pending ? t("submitting") : t("submit")}
        </Button>
        <p className="max-w-[38ch] text-fine text-ink-3">{t("privacy")}</p>
      </div>
    </form>
  );
}

type FieldProps = {
  htmlFor: string;
  label: string;
  /** "obligatoriu" / "opțional" — written out, never a bare asterisk. */
  note: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
};

function Field({ htmlFor, label, note, error, errorId, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-ui font-medium text-ink"
      >
        {label}
        <span className="text-fine font-normal text-ink-3">{note}</span>
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-fine" style={{ color: DANGER }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
