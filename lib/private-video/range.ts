export type ParsedRange =
  | { kind: "full" }
  | { kind: "partial"; start: number; end: number; length: number }
  | { kind: "unsatisfiable" };

export function parseSingleByteRange(header: string | null, size: number): ParsedRange {
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("Invalid object size");
  if (header === null) return { kind: "full" };

  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return { kind: "unsatisfiable" };

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "unsatisfiable" };
    }
    const length = Math.min(suffixLength, size);
    return { kind: "partial", start: size - length, end: size - 1, length };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start >= size ||
    requestedEnd < start
  ) {
    return { kind: "unsatisfiable" };
  }

  const end = Math.min(requestedEnd, size - 1);
  return { kind: "partial", start, end, length: end - start + 1 };
}
