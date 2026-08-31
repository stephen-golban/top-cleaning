import { useTranslations } from "next-intl";
import { CONTACT } from "@/components/layout";
import { AppLink, ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";

export type CtaRowProps = {
  /** Where the primary action goes. Defaults to the contact page. */
  quoteHref?: "/contact";
  /** Drop the primary button and leave only the phone number. */
  phoneOnly?: boolean;
  className?: string;
};

/**
 * Direction B's `.cta-row`: one filled action and one hairline-underlined
 * phone number, side by side.
 *
 * The number is a real `tel:` link at every width, not a decorative label —
 * the old site converted almost entirely on tap-to-call, and the deck's own
 * critique of this direction was its slow time-to-contact. Every place that
 * asks for a decision offers both paths.
 */
export function CtaRow({ quoteHref = "/contact", phoneOnly, className }: CtaRowProps) {
  const t = useTranslations("common");

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      {phoneOnly ? null : (
        <ButtonLink href={quoteHref} variant="solid" size="md">
          {t("cta.quote")}
        </ButtonLink>
      )}
      <AppLink href={CONTACT.phoneHref} variant="underline" className="tnum">
        {CONTACT.phoneDisplay}
      </AppLink>
    </div>
  );
}
