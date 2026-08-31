# `src/content`

Typed, structured site data — services, FAQ entries, contact details.

Rules:

- Data only. No JSX, no styling, no fetching.
- Every user-facing string is a **message key**, not literal copy. Copy itself
  lives in `messages/{ro,ru,en}.json`; entries here reference those keys so the
  same structure renders in all three locales.
- Export a `const` plus its `type`, so pages get compile-time safety.
