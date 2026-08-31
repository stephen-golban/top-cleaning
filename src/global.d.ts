/**
 * Types every `t()` call in the app against the Romanian message file, which is
 * the reference locale. A typo or a key that only exists in one place fails
 * `pnpm typecheck`.
 *
 * RO being the reference means TypeScript alone cannot see a key that RU or EN
 * has fallen behind on; `src/i18n/message-parity.ts` asserts the three files
 * have identical key sets, and `pnpm check:i18n` reports the offending paths.
 */
import type { routing } from "@/i18n/routing";
import type messages from "../messages/ro.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
