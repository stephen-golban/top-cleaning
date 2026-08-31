/**
 * Compile-time guarantees about the message files.
 *
 * `src/global.d.ts` types every `t()` call against `messages/ro.json`, which
 * catches typos and missing keys in RO — but nothing stops `ru.json` or
 * `en.json` from quietly falling behind. These assertions close that gap: if
 * the three files stop having identical key sets, `pnpm typecheck` fails.
 *
 * `pnpm check:i18n` does the same check at runtime and prints the offending key
 * paths, which is the friendlier way to find out *what* diverged.
 *
 * Everything here is type-only and erases to nothing at runtime.
 */
import type { ImageSlotId } from "@/content/images";
import type { ServiceId } from "@/content/services";
import type enMessages from "../../messages/en.json";
import type roMessages from "../../messages/ro.json";
import type ruMessages from "../../messages/ru.json";

type Ro = typeof roMessages;
type Ru = typeof ruMessages;
type En = typeof enMessages;

/** Collapses a message tree to its key structure, discarding the copy itself. */
type KeyShape<T> = T extends string
  ? true
  : T extends object
    ? { [K in keyof T]-?: KeyShape<T[K]> }
    : true;

type Assert<T extends true> = T;

/** `true` when `A` has at least every key of `B`, at every depth. */
type Covers<A, B> = KeyShape<A> extends KeyShape<B> ? true : false;

/** Both directions together mean: exactly the same keys, no orphans either way. */
export type RuHasEveryRoKey = Assert<Covers<Ru, Ro>>;
export type RoHasEveryRuKey = Assert<Covers<Ro, Ru>>;
export type EnHasEveryRoKey = Assert<Covers<En, Ro>>;
export type RoHasEveryEnKey = Assert<Covers<Ro, En>>;

type SameKeys<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * The content layer and the message files have to agree on two id sets:
 * every photography slot needs alt text, and every service needs page metadata.
 */
export type EveryImageSlotHasAltText = Assert<
  SameKeys<keyof Ro["common"]["alt"], ImageSlotId>
>;
export type EveryServiceHasMetadata = Assert<
  SameKeys<keyof Ro["meta"]["service"], ServiceId>
>;
