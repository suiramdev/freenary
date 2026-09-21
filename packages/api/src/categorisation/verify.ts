import { verify } from "node:crypto";

import { env } from "@freenary/env/server";
import { Option } from "effect";

const ALGORITHM_FROM_KEY = null;

const configuredPublicKey = (): string | null => {
  const key = env.DICTIONARY_PUBLIC_KEY?.trim();

  return key === undefined || key.length === 0 ? null : key;
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
