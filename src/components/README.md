# `src/components`

Reusable UI. Server Components by default; add `"use client"` only where
interactivity genuinely requires it.

- Primitives (button, container, section) live at the top level.
- Page-specific sections go in a subfolder named after the route.
- Components take copy as props or read it via `useTranslations` — never
  hardcode user-facing strings.
