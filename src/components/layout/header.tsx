import { useTranslations } from "next-intl";
import { AppLink, Container, PhoneIcon, Wordmark } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CONTACT } from "./contact";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { HOME_HREF, PRIMARY_NAV } from "./nav-config";

export type HeaderProps = {
  /**
   * Direction B's home page runs the hero photograph straight under the nav
   * with no rule. Interior pages, which start on white, need the hairline.
   */
  divider?: boolean;
  className?: string;
};

/**
 * Direction B's nav: wordmark left, links centre, phone and language right.
 *
 * The deck's known weakness is time-to-contact, so the fix is structural: the
 * phone number is a visible, tappable link at *every* width — it never collapses
 * into the menu. Below 820px the page links and the language switcher move into
 * the sheet; the number and the wordmark stay in the bar.
 */
export function Header({ divider = false, className }: HeaderProps) {
  const t = useTranslations("nav");

  return (
    <header
      className={cn(
        "relative z-20 bg-ground",
        divider && "border-b border-hairline",
        className,
      )}
    >
      <Container
        as="nav"
        aria-label={t("primaryLabel")}
        className="flex items-center justify-between gap-4 py-4"
      >
        <AppLink href={HOME_HREF} variant="bare">
          <Wordmark />
        </AppLink>

        <ul className="hidden items-center gap-5 min-[820px]:flex">
          {PRIMARY_NAV.map((item) => (
            <li key={item.key}>
              <AppLink href={item.href} variant="nav" className="whitespace-nowrap">
                {t(item.key)}
              </AppLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 min-[820px]:gap-4">
          <AppLink
            href={CONTACT.phoneHref}
            variant="bare"
            className="inline-flex items-center gap-2 py-1 text-ui font-medium whitespace-nowrap text-ink transition-colors duration-(--duration-base) hover:text-accent-strong"
          >
            <PhoneIcon size={15} className="hidden min-[400px]:block" />
            <span className="tnum">{CONTACT.phoneDisplay}</span>
          </AppLink>

          <LanguageSwitcher className="hidden min-[820px]:flex" />

          <MobileMenu items={PRIMARY_NAV} className="min-[820px]:hidden" />
        </div>
      </Container>
    </header>
  );
}
