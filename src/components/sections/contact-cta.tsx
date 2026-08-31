import { useTranslations } from "next-intl";
import { CONTACT } from "@/components/layout";
import { AppLink, ChatIcon, Container, Heading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CtaRow } from "./cta-row";

export type ContactCtaProps = { className?: string };

/**
 * The closing band on interior pages.
 *
 * Deliberately lighter than `QuoteSection`: those pages already spent the
 * visitor's attention on their own content, and repeating the full form at the
 * bottom of all five would put a client bundle on every route to say something
 * one button already says. The button is one tap from the real form.
 */
export function ContactCta({ className }: ContactCtaProps) {
  const t = useTranslations("home.contact");
  const tCommon = useTranslations("common");

  return (
    <section className={cn("bg-surface py-(--spacing-section)", className)}>
      <Container>
        <div className="grid items-end gap-6 min-[820px]:grid-cols-[minmax(0,1fr)_auto] min-[820px]:gap-12">
          <div>
            <Heading level={2} size="subtitle">
              {t("title")}
            </Heading>
            <p className="mt-3 max-w-[52ch] text-body text-ink-2">{t("description")}</p>
          </div>

          <div className="grid gap-4">
            <CtaRow />
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <AppLink
                href={CONTACT.whatsappHref}
                variant="quiet"
                className="inline-flex items-center gap-2 py-1"
              >
                <ChatIcon size={15} />
                {tCommon("cta.whatsapp")}
              </AppLink>
              <AppLink
                href={CONTACT.viberHref}
                variant="quiet"
                className="inline-flex items-center gap-2 py-1"
              >
                <ChatIcon size={15} />
                {tCommon("cta.viber")}
              </AppLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
