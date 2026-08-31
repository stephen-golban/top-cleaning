"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  AppLink,
  Button,
  ButtonLink,
  ChatIcon,
  CloseIcon,
  MailIcon,
  MenuIcon,
  PhoneIcon,
  Wordmark,
} from "@/components/ui";
import { CONTACT } from "./contact";
import { LanguageSwitcher } from "./language-switcher";
import type { NavItem } from "./nav-config";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea';

export type MobileMenuProps = {
  items: readonly NavItem[];
  className?: string;
};

/**
 * The one place a client component is justified in the shell.
 *
 * It is a real dialog: `aria-expanded` on the trigger, `role="dialog"` +
 * `aria-modal` on the sheet, focus moved in on open and returned to the trigger
 * on close, Tab cycled inside, Escape to dismiss, the page behind it locked
 * from scrolling, and an automatic close when the route changes.
 *
 * The header keeps the phone number visible behind it at every width, so this
 * menu is never the only path to a call.
 */
export function MobileMenu({ items, className }: MobileMenuProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Close on navigation. Without this the sheet survives a client-side route
  // change and traps the user on the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Return focus to the trigger when the sheet closes, but not on first render.
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Lock the page behind the sheet, compensating for the scrollbar so the
  // layout does not jump.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Escape to close, Tab trapped inside the sheet.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;

      const current = document.activeElement;
      const inside = current instanceof Node && panel.contains(current);

      if (event.shiftKey && (!inside || current === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <div className={className}>
      <Button
        ref={triggerRef}
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("openMenu")}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </Button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-ground"
        >
          <div className="mx-auto flex w-full max-w-(--container-wide) items-center justify-between gap-4 px-(--spacing-gutter) py-4">
            <Wordmark />
            <Button
              ref={closeRef}
              variant="outline"
              size="icon"
              aria-label={t("closeMenu")}
              onClick={close}
            >
              <CloseIcon />
            </Button>
          </div>

          {/* Named `menu`, not `primaryLabel`: the header's own <nav> already
              carries that name and stays in the accessibility tree behind the
              sheet, so reusing it puts two identically-named navigation
              landmarks on the page (axe `landmark-unique`). */}
          <nav
            aria-label={t("menu")}
            className="mx-auto w-full max-w-(--container-wide) px-(--spacing-gutter) pt-2"
          >
            <ul className="grid">
              {items.map((item) => (
                <li key={item.key} className="border-t border-hairline last:border-b">
                  <AppLink
                    href={item.href}
                    variant="bare"
                    className="block py-4 font-serif text-item font-normal text-ink transition-colors duration-(--duration-base) [font-optical-sizing:auto] hover:text-accent-strong"
                  >
                    {t(item.key)}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mx-auto grid w-full max-w-(--container-wide) gap-4 px-(--spacing-gutter) pt-8">
            <ButtonLink
              href={CONTACT.phoneHref}
              variant="solid"
              size="lg"
              className="w-full"
            >
              <PhoneIcon />
              <span className="tnum">{CONTACT.phoneDisplay}</span>
            </ButtonLink>

            <ul className="grid gap-3 text-ui">
              <li>
                <AppLink
                  href={CONTACT.whatsappHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5 py-1"
                >
                  <ChatIcon />
                  {tCommon("cta.whatsapp")}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={CONTACT.viberHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5 py-1"
                >
                  <ChatIcon />
                  {tCommon("cta.viber")}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={CONTACT.emailHref}
                  variant="quiet"
                  className="inline-flex items-center gap-2.5 py-1"
                >
                  <MailIcon />
                  {CONTACT.email}
                </AppLink>
              </li>
            </ul>
          </div>

          <div className="mx-auto mt-auto w-full max-w-(--container-wide) px-(--spacing-gutter) py-8">
            <LanguageSwitcher size="md" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
