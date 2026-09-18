import { verify } from "node:crypto";

import { Option } from "effect";

const ALGORITHM_FROM_KEY = null;

const configuredPublicKey = (): string | null => {
  const key = process.env.DICTIONARY_PUBLIC_KEY;

  return key && key.trim().length > 0 ? key.trim() : null;
};

const verifiedOrNone = Option.liftThrowable(
  (content: Buffer, publicKey: string, signature: Buffer): boolean =>
    verify(ALGORITHM_FROM_KEY, content, publicKey, signature)
);

export const isVerificationConfigured = (): boolean =>
  configuredPublicKey() !== null;

export const verifySignature = (
  content: Buffer,
  signature: Buffer
): boolean => {
  const publicKey = configuredPublicKey();

  if (publicKey === null) {
    return false;
  }

  return Option.getOrElse(
    verifiedOrNone(content, publicKey, signature),
    () => false
  );
};
