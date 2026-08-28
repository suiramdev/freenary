import { verify } from "node:crypto";

/**
 * Read the Ed25519 public key from the environment.
 * Returns null when the variable is absent or blank.
 */
const getPublicKey = (): string | null => {
  const key = process.env.DICTIONARY_PUBLIC_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
};

/** Whether signature verification is configured (env var set). */
export const isVerificationConfigured = (): boolean => getPublicKey() !== null;

/**
 * Verify an Ed25519 signature over file contents.
 * Returns true when valid, false when invalid.
 * Fails closed: returns false when no key is configured.
 */
export const verifySignature = (
  content: Buffer,
  signature: Buffer
): boolean => {
  const publicKey = getPublicKey();
  if (!publicKey) {
    return false;
  }
  try {
    return verify(null, content, publicKey, signature);
  } catch {
    return false;
  }
};
