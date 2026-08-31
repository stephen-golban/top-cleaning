import { useTranslations } from "next-intl";
import { Container, Heading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ContactChannels } from "./contact-channels";
import { QuoteFormBlock } from "./quote-form-block";

export type QuoteSectionProps = {
  /** Rendered as the section's `h2`. */
  title: string;
  description: string;
  /** Anchor target, so a CTA elsewhere on the site can land on the form. */
  id?: string;
  className?: string;
};

/**
 * Heading, the ways to reach a human, and the form — side by side.
 *
 * The two halves are not alternatives to each other, they are for two different
 * people: the visitor who wants this dealt with in ten seconds taps the number,
 * and the visitor who is comparing three companies at 11pm leaves three fields.
 * The old site only served the first of those, which is the single largest
 * conversion gap this rewrite closes.
 */
export function QuoteSection({ title, description, id, className }: QuoteSectionProps) {
  const t = useTranslations("contact");

  return (
    <section id={id} className={cn("bg-surface py-(--spacing-section-lg)", className)}>
      <Container>
        <div className="grid gap-10 min-[900px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] min-[900px]:gap-16">
          <div>
            <Heading level={2} size="title">
              {title}
            </Heading>
            <p className="mt-3.5 max-w-[46ch] text-body text-ink-2">{description}</p>
            <ContactChannels includeArea={false} className="mt-8 max-w-[34ch]" />
          </div>

          <div className="rounded-sm bg-ground p-6 shadow-sm min-[520px]:p-8">
            <h3 className="text-[1.0625rem] font-semibold text-ink">
              {t("formTitle")}
            </h3>
            <p className="mt-1 text-ui text-ink-3">{t("formLead")}</p>
            <QuoteFormBlock className="mt-6" />
          </div>
        </div>
      </Container>
    </section>
  );
}
