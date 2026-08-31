/**
 * Join conditional class names. Deliberately tiny — no `clsx`/`tailwind-merge`
 * dependency until something actually needs conflict resolution.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
