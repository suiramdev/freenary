import { createHash, timingSafeEqual } from "node:crypto";

const TOKEN_DIGEST = "sha256";

const digestOf = (value: string): Buffer =>
  createHash(TOKEN_DIGEST).update(value).digest();

export const isSetupToken = (expected: string, candidate: string): boolean =>
  timingSafeEqual(digestOf(candidate.trim()), digestOf(expected));
