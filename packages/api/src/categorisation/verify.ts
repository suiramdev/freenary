import { verify } from "node:crypto";

/**
 * Ed25519 public key for dictionary signature verification.
 * Replace this placeholder after running: bun run generate:key
 */
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END PUBLIC KEY-----`;

/** Whether signature verification is configured (non-placeholder key). */
export const isVerificationConfigured = (): boolean =>
  !PUBLIC_KEY.includes("AAAAAAAAAA");

/**
 * Verify an Ed25519 signature over file contents.
 * Returns true when valid, false when invalid.
 * When no real public key is configured, returns true (allows unsigned
 * dictionaries during development).
 */
export const verifySignature = (
  content: Buffer,
  signature: Buffer
): boolean => {
  if (!isVerificationConfigured()) {
    return true;
  }
  try {
    return verify(null, content, PUBLIC_KEY, signature);
  } catch {
    return false;
  }
};
