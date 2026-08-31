import { useTranslations } from "next-intl";
import { ContactCta, ServiceCards } from "@/components/sections";
import {
  AppLink,
  ArrowRightIcon,
  Heading,
  Section,
  SectionHeader,
} from "@/components/ui";

/**
 * A 404 that is still a route into the site.
 *
 * A dead end here is a lost job: somebody following a stale link from the old
 * `/servicii-de-curatenie/…` scheme is a person who was already looking for a
 * cleaner. So the page apologises briefly and then shows the four services and
 * a phone number, which is what they wanted in the first place.
 */
export default function LocaleNotFound() {
  const t = useTranslations("notFound");
  const tServices = useTranslations("services");

  return (
    <>
      <Section size="lg" className="border-t border-hairline">
        <Heading level={1} size="display">
          {t("title")}
        </Heading>
        <p className="mt-4 max-w-[46ch] text-lead text-ink-3">{t("description")}</p>
        <AppLink
          href="/"
          variant="underline"
          className="mt-7 inline-flex items-center gap-1.5"
        >
          {t("backHome")}
          <ArrowRightIcon size={14} />
        </AppLink>
      </Section>

      <Section
        size="md"
        className="border-t border-hairline"
        aria-labelledby="nf-services"
      >
        <SectionHeader id="nf-services" title={tServices("title")} />
        <ServiceCards />
      </Section>

      <ContactCta />
    </>
  );
}
