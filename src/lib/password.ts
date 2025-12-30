import crypto from "crypto";

/**
 * Generate a random password/recovery key.
 * - Uses URL-safe base64 without confusing chars.
 * - Not meant to be cryptographic secret storage (we still hash before saving).
 */
export function generateRandomString(bytes = 12) {
  // base64url is supported in Node 18+ (Next.js default runtime for server)
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Convenience: a reasonably strong default password for initial login. */
export function generateInitialPassword() {
  // 12 bytes -> ~16 chars base64url
  return generateRandomString(12);
}

/** Convenience: recovery key user can keep offline (print/save). */
export function generateRecoveryKey() {
  // Slightly longer so it’s harder to guess
  return generateRandomString(16);
}
