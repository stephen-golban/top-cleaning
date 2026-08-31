export function securityHeaders(): Headers {
  return new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  });
}
export function jsonResponse(status: number, message: string): Response {
  const headers = securityHeaders();
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
