import { createSessionToken, validateAccessSecret } from "../../../lib/private-video/crypto";
import { sessionCookie } from "../../../lib/private-video/cookies";
import { videoEnv, sessionTtlSeconds } from "../../../lib/private-video/env";
import { jsonResponse, securityHeaders } from "../../../lib/private-video/headers";

const MAX_BODY_BYTES = 2_048;

async function readLimitedText(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Request body too large");
    }
    text += decoder.decode(value, { stream: true });
  }
}
export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("Origin") !== videoEnv.PUBLIC_ORIGIN) {
    return jsonResponse(403, "Forbidden");
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse(415, "Expected application/json");
  }

  let body: unknown;
  try {
    body = JSON.parse(await readLimitedText(request));
  } catch (error) {
    return jsonResponse(error instanceof RangeError ? 413 : 400, "Invalid request");
  }

  const secret =
    typeof body === "object" && body !== null && "secret" in body
      ? (body as { secret?: unknown }).secret
      : undefined;
  if (typeof secret !== "string" || secret.length < 16 || secret.length > 512) {
    return jsonResponse(401, "Invalid access link");
  }

  try {
    if (!(await validateAccessSecret(secret, videoEnv.VIDEO_ACCESS_TOKEN_SHA256_HEX))) {
      return jsonResponse(401, "Invalid access link");
    }

    const ttl = sessionTtlSeconds(videoEnv);
    const token = await createSessionToken(videoEnv.VIDEO_SESSION_HMAC_KEY_HEX, ttl);
    const headers = securityHeaders();
    headers.set("Set-Cookie", sessionCookie(token, ttl));
    return new Response(null, { status: 204, headers });
  } catch {
    return jsonResponse(500, "Server configuration error");
  }
}
