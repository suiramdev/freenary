import type { StoredSettings } from "@freenary/instance-config/candidate";
import type {
  Integration,
  IntegrationVariant,
} from "@freenary/instance-config/integrations";
import { isSecretField, keysOf } from "@freenary/instance-config/integrations";

export const candidateOf = (
  integration: Integration,
  variant: IntegrationVariant,
  supplied: Readonly<Record<string, string>>,
  stored: StoredSettings
): Record<string, string> => {
  const owned = new Set<string>(keysOf(integration));
  const candidate: Record<string, string> = {};

  for (const [key, held] of Object.entries(stored)) {
    if (!owned.has(key)) {
      candidate[key] = held;
    }
  }

  if (variant.discriminantValue !== null) {
    candidate[integration.discriminantKey] = variant.discriminantValue;
  }

  for (const field of variant.fields) {
    const offered = supplied[field.key]?.trim();
    const kept = stored[field.key];

    if (offered !== undefined && offered !== "") {
      candidate[field.key] = offered;
    } else if (isSecretField(field.kind) && kept !== undefined) {
      candidate[field.key] = kept;
    }
  }

  return candidate;
};

export const writesOf = (
  integration: Integration,
  candidate: Readonly<Record<string, string>>
): Map<string, string | null> => {
  const writes = new Map<string, string | null>();

  for (const key of keysOf(integration)) {
    writes.set(key, candidate[key] ?? null);
  }

  return writes;
};
