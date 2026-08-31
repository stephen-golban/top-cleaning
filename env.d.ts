declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    PUBLIC_ORIGIN: string;
    VIDEO_SESSION_TTL_SECONDS: string;
    VIDEO_R2_KEY: string;
    VIDEO_CONTENT_TYPE: string;
    VIDEO_ACCESS_TOKEN_SHA256_HEX: string;
    VIDEO_SESSION_HMAC_KEY_HEX: string;
  }
}
