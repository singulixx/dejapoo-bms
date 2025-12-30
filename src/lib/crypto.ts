import crypto from "crypto";

/**
 * Simple AES-256-GCM helpers used to store marketplace credentials/tokens in DB.
 *
 * Format: base64(iv[12] + tag[16] + ciphertext)
 */

function getKey() {
  const secret = process.env.MARKETPLACE_SECRET || process.env.JWT_SECRET || "dev-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptJson(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson<T = any>(b64: string): T {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}
