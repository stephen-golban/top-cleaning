import { useLocale, useTranslations } from "next-intl";
import { imageSlots, steps } from "@/content";
import { Band, Heading, Photo } from "@/components/ui";
import type { Locale } from "@/i18n/routing";

/**
 * Direction B's `.band`: a surface-toned, full-bleed two-up. The photograph
 * holds the left half at ≥820px and sits on top below that.
 *
 * The four steps are an ordered list separated by hairline rules rather than
 * four bordered cards — the same substitution Direction A makes everywhere, and
 * the reason this band reads as one object instead of a row of tiles. The
 * numeral is a real `<ol>` counter's worth of information, drawn in the serif
 * so it belongs to the headings rather than to the UI.
 */
export function ProcessBand() {
  const locale = useLocale() as Locale;
  const t = useTranslations("home.steps");
  const tAlt = useTranslations();
  const slot = imageSlots.process;

  return (
    <Band
      media={
        <Photo
          slot={slot}
          alt={tAlt(slot.altKey)}
          ratio="4/3"
          sizes="(min-width: 820px) 48vw, 100vw"
          className="min-[820px]:aspect-auto min-[820px]:h-full"
          priority={false}
        />
      }
    >
      <Heading level={2} size="subtitle">
        {t("title")}
      </Heading>
      <p className="mt-4 max-w-[52ch] text-body text-ink-2">{t("description")}</p>

      <ol className="mt-7 grid">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="grid grid-cols-[2.375rem_minmax(0,1fr)] gap-3.5 border-t border-hairline-strong py-3.5 last:border-b last:border-hairline-strong"
          >
            <span
              aria-hidden="true"
              className="tnum font-serif text-[1.375rem] leading-[1.1] font-normal text-accent-strong [font-optical-sizing:auto]"
            >
              {index + 1}
            </span>
            <div>
              <Heading level={3} size="label">
                {step.title[locale]}
              </Heading>
              <p className="mt-1 max-w-[46ch] text-[0.875rem] leading-[1.5] text-ink-3">
                {step.description[locale]}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Band>
  );
}
