import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Every unmatched path *inside* a locale, routed to the branded 404.
 *
 * Without this file, `/ro/nope` does not reach `src/app/[locale]/not-found.tsx`
 * at all. Next only renders the nearest `not-found` boundary when some segment
 * on the matched route calls `notFound()`; a path that matches **no** route
 * never enters `[locale]/`, so it falls through to Next's implicit
 * `/_not-found` — the unstyled black-on-white "404: This page could not be
 * found." That was the live behaviour until this page existed, on `/ro/nope`,
 * `/nope` and every stale inbound link, which is precisely the visitor
 * `not-found.tsx` was written for: somebody following a dead link from the old
 * `/servicii-de-curatenie/…` scheme is somebody already looking for a cleaner.
 * Only a page that explicitly called `notFound()` — an unknown service slug —
 * ever saw the branded version.
 *
 * A catch-all is the lowest-priority match in the segment, so it changes
 * nothing else: `/ro/servicii`, `/ro/despre-noi` and `/ro/v/<token>` all match
 * their own routes first. It is deliberately **not** the fix for the implicit
 * `/_not-found`, which is outside `[locale]/` and stays Next's own page — see
 * `.agents/FOLLOWUPS.md` on why `experimental.globalNotFound` is not an option
 * on Next 15.5.24.
 *
 * The response is a real 404, not a soft one: `notFound()` sets the status, and
 * `not-found.tsx` renders under this locale's layout, so the page is localized
 * and carries `<meta name="robots" content="noindex">`.
 */
export default async function LocaleCatchAll({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // A bad locale is a 404 too, and `setRequestLocale` rejects an unknown one.
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  notFound();
}
