const encoder = new TextEncoder();

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

export const SESSION_COOKIE = "__Host-video_session";
export const SESSION_VERSION = "v1";

export function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) {
    throw new Error("Expected an even-length hexadecimal string");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importHmacKey(keyHex: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  if (keyBytes.length < 32) throw new Error("HMAC key must contain at least 32 bytes");

  return crypto.subtle.importKey(
    "raw",
    ownedBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function validateAccessSecret(
  candidate: string,
  expectedSha256Hex: string,
): Promise<boolean> {
  const expected = hexToBytes(expectedSha256Hex);
  if (expected.length !== 32) throw new Error("Access-token SHA-256 must be 32 bytes");
  const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(candidate)));
  return constantTimeEqual(actual, expected);
}

export async function createSessionToken(
  hmacKeyHex: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
  nonce = crypto.getRandomValues(new Uint8Array(16)),
): Promise<string> {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86_400) {
    throw new Error("Session TTL must be an integer from 60 to 86400 seconds");
  }
  if (nonce.length !== 16) throw new Error("Session nonce must be 16 bytes");

  const payload = [
    SESSION_VERSION,
    String(nowSeconds),
    String(nowSeconds + ttlSeconds),
    bytesToBase64Url(nonce),
  ].join(".");
  const key = await importHmacKey(hmacKeyHex, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${bytesToBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string,
  hmacKeyHex: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 5) return false;
  const [version, issuedText, expiresText, nonceText, signatureText] = parts;
  if (
    version !== SESSION_VERSION ||
    !/^\d{1,12}$/.test(issuedText) ||
    !/^\d{1,12}$/.test(expiresText) ||
    !/^[A-Za-z0-9_-]{22}$/.test(nonceText) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signatureText)
  ) {
    return false;
  }

  const issuedAt = Number(issuedText);
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return false;

  try {
    const key = await importHmacKey(hmacKeyHex, ["verify"]);
    const payload = parts.slice(0, 4).join(".");
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      ownedBuffer(base64UrlToBytes(signatureText)),
      ownedBuffer(encoder.encode(payload)),
    );
    if (!validSignature) return false;
  } catch {
    return false;
  }

  return (
    issuedAt <= nowSeconds + 60 &&
    expiresAt > nowSeconds &&
    expiresAt > issuedAt &&
    expiresAt - issuedAt <= 86_400
  );
}
