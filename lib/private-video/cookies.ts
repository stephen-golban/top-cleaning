export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) return item.slice(separator + 1).trim();
  }
  return null;
}
export function sessionCookie(value: string, ttlSeconds: number): string {
  return [
    `__Host-video_session=${value}`,
    "Path=/",
    `Max-Age=${ttlSeconds}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
}
