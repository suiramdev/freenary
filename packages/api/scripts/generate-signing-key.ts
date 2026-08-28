/**
 * Generate an Ed25519 key pair for dictionary signing.
 * Writes the private key to data/dictionary.key (gitignored)
 * and prints the public key for embedding in source.
 *
 * Usage: bun packages/api/scripts/generate-signing-key.ts
 */
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

const KEY_PATH = path.resolve(import.meta.dirname, "../data/dictionary.key");

const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

writeFileSync(KEY_PATH, privateKey, { mode: 0o600 });
console.log("Private key written to:", KEY_PATH);
console.log("\nPublic key (embed in verify.ts):\n");
console.log(publicKey);
