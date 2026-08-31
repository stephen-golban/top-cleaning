import { env } from "cloudflare:workers";

export interface VideoBindings {
  FILES: R2Bucket;
  PUBLIC_ORIGIN: string;
  VIDEO_ACCESS_TOKEN_SHA256_HEX: string;
  VIDEO_SESSION_HMAC_KEY_HEX: string;
  VIDEO_SESSION_TTL_SECONDS: string;
  VIDEO_R2_KEY: string;
  VIDEO_CONTENT_TYPE?: string;
}
export const videoEnv = env as unknown as VideoBindings;

export function sessionTtlSeconds(bindings: VideoBindings): number {
  const ttl = Number(bindings.VIDEO_SESSION_TTL_SECONDS);
  if (!Number.isSafeInteger(ttl) || ttl < 60 || ttl > 86_400) {
    throw new Error("Invalid VIDEO_SESSION_TTL_SECONDS");
  }
  return ttl;
}
