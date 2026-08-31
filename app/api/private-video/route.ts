import { SESSION_COOKIE, verifySessionToken } from "../../../lib/private-video/crypto";
import { readCookie } from "../../../lib/private-video/cookies";
import { videoEnv } from "../../../lib/private-video/env";
import { securityHeaders } from "../../../lib/private-video/headers";
import { parseSingleByteRange } from "../../../lib/private-video/range";

function mediaHeaders(object: R2Object, contentLength: number): Headers {
  const headers = securityHeaders();
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Type", object.httpMetadata?.contentType ?? videoEnv.VIDEO_CONTENT_TYPE ?? "video/mp4");
  headers.set("Content-Disposition", "inline");
  headers.set("Content-Length", String(contentLength));
  headers.set("ETag", object.httpEtag);
  headers.set("Last-Modified", object.uploaded.toUTCString());
  headers.set("Vary", "Cookie, Range");
  return headers;
}

async function authorized(request: Request): Promise<boolean> {
  const token = readCookie(request.headers.get("Cookie"), SESSION_COOKIE);
  return token !== null && verifySessionToken(token, videoEnv.VIDEO_SESSION_HMAC_KEY_HEX);
}

async function serve(request: Request, headOnly: boolean): Promise<Response> {
  try {
    if (!(await authorized(request))) {
      return new Response("Unauthorized", { status: 401, headers: securityHeaders() });
    }
  } catch {
    return new Response("Server configuration error", { status: 500, headers: securityHeaders() });
  }

  let metadata: R2Object | null;
  try {
    metadata = await videoEnv.FILES.head(videoEnv.VIDEO_R2_KEY);
  } catch {
    return new Response("Storage unavailable", { status: 503, headers: securityHeaders() });
  }
  if (!metadata) return new Response("Not found", { status: 404, headers: securityHeaders() });

  if (headOnly) {
    return new Response(null, { status: 200, headers: mediaHeaders(metadata, metadata.size) });
  }

  const parsed = parseSingleByteRange(request.headers.get("Range"), metadata.size);
  if (parsed.kind === "unsatisfiable") {
    const headers = mediaHeaders(metadata, 0);
    headers.set("Content-Range", `bytes */${metadata.size}`);
    return new Response(null, { status: 416, headers });
  }

  let object: R2ObjectBody | null;
  try {
    object = await videoEnv.FILES.get(
      videoEnv.VIDEO_R2_KEY,
      parsed.kind === "partial"
        ? { range: { offset: parsed.start, length: parsed.length } }
        : undefined,
    );
  } catch {
    return new Response("Storage unavailable", { status: 503, headers: securityHeaders() });
  }
  if (!object) return new Response("Not found", { status: 404, headers: securityHeaders() });

  const contentLength = parsed.kind === "partial" ? parsed.length : metadata.size;
  const headers = mediaHeaders(object, contentLength);
  if (parsed.kind === "partial") {
    headers.set("Content-Range", `bytes ${parsed.start}-${parsed.end}/${metadata.size}`);
  }

  return new Response(object.body, {
    status: parsed.kind === "partial" ? 206 : 200,
    headers,
  });
}

export function GET(request: Request): Promise<Response> {
  return serve(request, false);
}

export function HEAD(request: Request): Promise<Response> {
  return serve(request, true);
}
