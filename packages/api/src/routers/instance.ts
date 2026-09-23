import { SETUP_CLAIM_RATE_LIMIT } from "@freenary/auth/policy";
import type {
  Integration,
  IntegrationField,
  IntegrationVariant,
  ServerSettingKey,
  SettingSource,
  StoredSettings,
} from "@freenary/instance-config";
import {
  environmentOwns,
  findIntegration,
  findVariant,
  instanceConfigFault,
  instanceConfigurableKeys,
  integrations,
  isSecretField,
  keysOf,
  markSetupComplete,
  readSetupState,
  readStoredSettings,
  redeemSetupToken,
  settings,
  storedSettingsInForce,
  validateSettings,
  writeStoredSettings,
} from "@freenary/instance-config";
import { ORPCError } from "@orpc/server";
import { Effect, Option, Result } from "effect";
import { z } from "zod";

import {
  operatorProcedure,
  protectedProcedure,
  publicProcedure,
} from "../index";
import { candidateOf, writesOf } from "../instance/merge";
import { findProbe } from "../instance/probes";
import { callerBucket, consumeRateLimit } from "../lib/rate-limit";

const RESTART_GRACE_MS = 250;

const DISABLED_VARIANT = "disabled";

const readCurrentSettings = (): Promise<StoredSettings> =>
  Effect.runPromise(readStoredSettings(settings.BETTER_AUTH_SECRET));

const sourceFor = (
  key: ServerSettingKey,
  stored: StoredSettings
): SettingSource => {
  if (environmentOwns(key)) {
    return "environment";
  }

  return stored[key] === undefined ? "unset" : "instance";
};

const heldValue = (
  key: ServerSettingKey,
  stored: StoredSettings
): string | null => {
  if (!environmentOwns(key)) {
    return stored[key] ?? null;
  }

  const fromEnvironment = settings[key];

  return fromEnvironment === undefined ? null : String(fromEnvironment);
};

const selectedVariantOf = (
  integration: Integration,
  stored: StoredSettings
): string => {
  if (sourceFor(integration.discriminantKey, stored) === "unset") {
    return DISABLED_VARIANT;
  }

  const held = heldValue(integration.discriminantKey, stored);
  const chosen = integration.variants.find(
    (variant) => variant.discriminantValue === held
  );

  return chosen?.id ?? DISABLED_VARIANT;
};

const isVariantComplete = (
  variant: IntegrationVariant,
  stored: StoredSettings
): boolean =>
  variant.fields.every(
    (field) => !field.required || heldValue(field.key, stored) !== null
  );

const describeField = (field: IntegrationField, stored: StoredSettings) => {
  const secret = isSecretField(field.kind);
  const held = heldValue(field.key, stored);

  return {
    key: field.key,
    kind: field.kind,
    present: held !== null,
    required: field.required,
    source: sourceFor(field.key, stored),
    value: secret ? null : held,
  };
};

const describeIntegration = (
  integration: Integration,
  stored: StoredSettings
) => {
  const selectedVariantId = selectedVariantOf(integration, stored);
  const selected = findVariant(integration, selectedVariantId);

  return {
    discriminantKey: integration.discriminantKey,
    discriminantSource: sourceFor(integration.discriminantKey, stored),
    id: integration.id,
    selectedVariantId,
    state:
      selectedVariantId === DISABLED_VARIANT
        ? ("disabled" as const)
        : Option.match(selected, {
            onNone: () => "incomplete" as const,
            onSome: (variant) =>
              isVariantComplete(variant, stored)
                ? ("configured" as const)
                : ("incomplete" as const),
          }),
    variants: integration.variants.map((variant) => ({
      fields: variant.fields.map((field) => describeField(field, stored)),
      id: variant.id,
    })),
  };
};

const hasUnappliedChange = (stored: StoredSettings): boolean => {
  const applied = storedSettingsInForce();

  for (const key of instanceConfigurableKeys) {
    if (!environmentOwns(key) && stored[key] !== applied[key]) {
      return true;
    }
  }

  return false;
};

export const instanceRouter = {
  claim: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await consumeRateLimit(
        `instance-claim:${callerBucket(context.headers)}`,
        SETUP_CLAIM_RATE_LIMIT
      );

      const claimed = await Effect.runPromise(
        Effect.result(redeemSetupToken(input.token, context.session.user.id))
      );

      if (Result.isFailure(claimed)) {
        throw new ORPCError("FORBIDDEN", {
          message:
            "The setup token is wrong, or the instance is already claimed.",
        });
      }

      return { claimed: true as const };
    }),

  complete: operatorProcedure.handler(async () => {
    await Effect.runPromise(markSetupComplete());

    return { completed: true as const };
  }),

  describe: operatorProcedure.handler(async () => {
    const stored = await readCurrentSettings();

    return {
      fault: Option.match(instanceConfigFault, {
        onNone: () => null,
        onSome: (rejected) => rejected.detail,
      }),
      integrations: integrations.map((integration) =>
        describeIntegration(integration, stored)
      ),
      restartRequired: hasUnappliedChange(stored),
    };
  }),

  restart: operatorProcedure.handler(() => {
    setTimeout(() => process.exit(0), RESTART_GRACE_MS);

    return { restarting: true as const };
  }),

  save: operatorProcedure
    .input(
      z.object({
        integrationId: z.string(),
        values: z.record(z.string(), z.string()),
        variantId: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const integration = Option.getOrThrowWith(
        findIntegration(input.integrationId),
        () => new ORPCError("NOT_FOUND", { message: "Unknown integration" })
      );

      const variant = Option.getOrThrowWith(
        findVariant(integration, input.variantId),
        () => new ORPCError("NOT_FOUND", { message: "Unknown variant" })
      );

      const owned = keysOf(integration).filter(environmentOwns);

      if (owned.length > 0) {
        return { keys: owned, outcome: "environment-owned" as const };
      }

      const stored = await readCurrentSettings();
      const candidate = candidateOf(integration, variant, input.values, stored);

      const missing = variant.fields.flatMap((field) =>
        field.required && candidate[field.key] === undefined ? [field.key] : []
      );

      if (missing.length > 0) {
        return { keys: missing, outcome: "missing-fields" as const };
      }

      const validated = validateSettings(candidate);

      if (Result.isFailure(validated)) {
        return {
          detail: validated.failure.detail,
          outcome: "invalid" as const,
        };
      }

      const probe = Option.getOrThrowWith(
        findProbe(integration.id, variant.id),
        () => new ORPCError("NOT_IMPLEMENTED", { message: "No check exists" })
      );

      const probed = await Effect.runPromise(
        Effect.result(probe(validated.success))
      );

      if (Result.isFailure(probed)) {
        const { reason } = probed.failure;

        return {
          detail: reason.detail,
          outcome: "probe-failed" as const,
          reason: reason.kind,
          status: reason.kind === "rejected" ? reason.status : null,
        };
      }

      await Effect.runPromise(
        writeStoredSettings(
          settings.BETTER_AUTH_SECRET,
          writesOf(integration, candidate),
          context.session.user.id
        )
      );

      return { outcome: "saved" as const, restartRequired: true };
    }),

  status: publicProcedure.handler(() => Effect.runPromise(readSetupState())),
};
