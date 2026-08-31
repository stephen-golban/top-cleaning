import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CONTACT } from "@/components/layout";
import { AppLink, ChatIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui";
import { cn } from "@/lib/cn";

type Row = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  /** Phone numbers get tabular figures so the digits line up. */
  tnum?: boolean;
};

export type ContactChannelsProps = {
  /** Include the served-area row. Off inside a CTA block, where it is noise. */
  includeArea?: boolean;
  className?: string;
};

/**
 * Every way to reach Top Cleaning, in the order they are most likely to be
 * used, on hairline rules rather than in boxes.
 *
 * There are exactly five facts here and there will not be a sixth: no street
 * address, no opening hours, no social profiles. `.agents/DECISIONS.md` is
 * explicit that inventing any of them is out of bounds, so the layout is built
 * to look finished at five rows rather than to look like it is missing a map.
 */
export function ContactChannels({
  includeArea = true,
  className,
}: ContactChannelsProps) {
  const t = useTranslations("contact");

  const rows: Row[] = [
    {
      key: "phone",
      icon: <PhoneIcon size={16} />,
      label: t("phoneLabel"),
      value: CONTACT.phoneDisplay,
      href: CONTACT.phoneHref,
      tnum: true,
    },
    {
      key: "whatsapp",
      icon: <ChatIcon size={16} />,
      label: t("whatsappLabel"),
      value: CONTACT.phoneDisplay,
      href: CONTACT.whatsappHref,
      tnum: true,
    },
    {
      key: "viber",
      icon: <ChatIcon size={16} />,
      label: t("viberLabel"),
      value: CONTACT.phoneDisplay,
      href: CONTACT.viberHref,
      tnum: true,
    },
    {
      key: "email",
      icon: <MailIcon size={16} />,
      label: t("emailLabel"),
      value: CONTACT.email,
      href: CONTACT.emailHref,
    },
  ];

  if (includeArea) {
    rows.push({
      key: "area",
      icon: <PinIcon size={16} />,
      label: t("areaLabel"),
      value: t("areaValue"),
    });
  }

  return (
    <ul className={cn("grid", className)}>
      {rows.map((row) => {
        const body = (
          <>
            <span className="mt-0.5 flex-none text-accent">{row.icon}</span>
            <span className="grid gap-0.5">
              <span className="text-fine text-ink-3">{row.label}</span>
              <span
                className={cn(
                  "text-[1.0625rem] leading-snug font-medium text-ink",
                  "transition-colors duration-(--duration-base) group-hover:text-accent-strong",
                  row.tnum && "tnum",
                )}
              >
                {row.value}
              </span>
            </span>
          </>
        );

        return (
          <li
            key={row.key}
            className="border-t border-hairline py-3.5 first:border-t-0 first:pt-0 last:pb-0"
          >
            {row.href ? (
              <AppLink href={row.href} variant="bare" className="group flex gap-3">
                {body}
              </AppLink>
            ) : (
              <span className="flex gap-3">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
