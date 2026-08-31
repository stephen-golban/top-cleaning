# `src/content`

Typed, structured site data: the four services, the four process steps, the six
benefits, the photography slots and the contact facts.

## Where copy lives

Two homes, split by shape rather than by importance:

| Kind of copy                                                                                                     | Lives in                                      | Read with                                                          |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Per-entity content that repeats with a structure — service names, blurbs, inclusion lists, step and benefit text | `src/content/*.ts`, as `Localized<T>` records | `import { services } from "@/content"` then `service.name[locale]` |
| Page chrome and one-off strings — headings, labels, CTAs, form copy, metadata, alt text                          | `messages/{ro,ru,en}.json`                    | `useTranslations()` / `getTranslations()`                          |

The split exists because the structured content is _rows_: four services, each
with the same fields and a list of N operations. Expressing that as flat message
keys (`services.items.3.list.11`) is what let the old site drift — its RU file
grew an orphan key, and the About page silently rendered four of six benefits
because it looped over the wrong collection. A tuple of typed records cannot do
either.

## Rules

- Data only. No JSX, no styling, no fetching.
- Every localized field is `Localized<T>` = `Record<Locale, T>`, never
  `Partial<…>`: a missing translation is a compile error, not an `undefined`
  that surfaces in the browser.
- Lists of localized lines (`readonly Localized<string>[]`), never localized
  lists — that way one language cannot end up with more items than another.
- RO and RU copy is the client's, reproduced verbatim from
  `.agents/source-inventory.md`. Do not re-tone it. EN is net-new.
- Invent nothing. There are no prices, no testimonials, no client counts, no
  years in business, no certifications, no opening hours and no street address
  in the source material, so none of those appear here.
- Photography is referenced by _slot_, not by file path (`images.ts`). The
  current images are Unsplash placeholders; swapping in the client's real photos
  must not touch any consumer.

## Message-file contract

`src/i18n/message-parity.ts` asserts at compile time that every `ImageSlotId`
has alt text under `common.alt.*` and every `ServiceId` has metadata under
`meta.service.*`. Adding a service or a photo slot therefore fails
`pnpm typecheck` until the three message files catch up.
