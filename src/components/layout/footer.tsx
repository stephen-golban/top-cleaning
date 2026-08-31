import { useTranslations } from "next-intl";
import {
  AppLink,
  ChatIcon,
  Container,
  Divider,
  MailIcon,
  PhoneIcon,
  PinIcon,
  Wordmark,
  type AppHref,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { CONTACT } from "./contact";
import { PRIMARY_NAV, SERVICES_HREF } from "./nav-config";

export type FooterServiceLink = {
  /** The localized service URL. */
  href: AppHref;
  /** Already-translated service name. */
  label: string;
};

export type FooterProps = {
  /**
   * The four services, with their localized slugs. Owned by content
   * (`src/content/services.ts`), so it arrives as a prop rather than being
   * imported here — the shell must not invent service names or guess slugs.
   * When it is absent the column falls back to a single link to the index.
   */
  services?: readonly FooterServiceLink[];
  className?: string;
};

export function Footer({ services, className }: FooterProps) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tContact = useTranslations("contact");
  const tServices = useTranslations("services");
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-hairline bg-ground", className)}>
      <Container className="py-(--spacing-section)">
        <div className="grid gap-x-(--spacing-grid) gap-y-10 min-[620px]:grid-cols-2 min-[980px]:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div className="min-[620px]:col-span-2 min-[980px]:col-span-1">
            <Wordmark />
            <p className="mt-4 max-w-[34ch] text-ui text-ink-3">{t("serviceArea")}</p>
          </div>

          <nav aria-labelledby="footer-pages">
            <h2 id="footer-pages" className="text-ui font-semibold text-ink">
              {t("navTitle")}
            </h2>
            <ul className="mt-4 grid gap-2.5">
              {PRIMARY_NAV.map((item) => (
                <li key={item.key}>
                  <AppLink href={item.href} variant="quiet">
                    {tNav(item.key)}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className="text-ui font-semibold text-ink">
              {t("servicesTitle")}
            </h2>
            <ul className="mt-4 grid gap-2.5">
              {services && services.length > 0 ? (
                services.map((service) => (
                  <li key={service.label}>
                    <AppLink href={service.href} variant="quiet">
                      {service.label}
                    </AppLink>
                  </li>
                ))
              ) : (
                <li>
                  <AppLink href={SERVICES_HREF} variant="quiet">
                    {tServices("allServices")}
                  </AppLink>
                </li>
              )}
            </ul>
          </nav>

          <div>
            <h2 id="footer-contact" className="text-ui font-semibold text-ink">
              {t("contactTitle")}
            </h2>
            <ul className="mt-4 grid gap-2.5" aria-labelledby="footer-contact">
              <li>
                <AppLink
                  href={CONTACT.phoneHref}
                  variant="bare"
                  className="inline-flex items-center gap-2.5 text-ui font-medium text-ink transition-colors duration-(--duration-base) hover:text-accent-strong"
                >
                  <PhoneIcon size={15} />
                  <span className="tnum">{CONTACT.phoneDisplay}</span>
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={CONTACT.whatsappHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5"
                >
                  <ChatIcon size={15} />
                  {tContact("whatsappLabel")}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={CONTACT.viberHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5"
                >
                  <ChatIcon size={15} />
                  {tContact("viberLabel")}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={CONTACT.emailHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5 break-all"
                >
                  <MailIcon size={15} />
                  {CONTACT.email}
                </AppLink>
              </li>
            </ul>
          </div>
        </div>

        <Divider className="mt-(--spacing-sechead)" />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-fine text-ink-3">
          <p>{t("copyright", { year })}</p>
          <p className="inline-flex items-center gap-1.5">
            <PinIcon size={13} />
            {tCommon("city")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
