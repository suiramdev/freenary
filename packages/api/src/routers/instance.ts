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
import { maskEnvironmentValue } from "../instance/mask";
import {
  candidateOf,
  isWhollyOwnedByEnvironment,
  missingKeysOf,
  writesOf,
} from "../instance/merge";
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

const MASKED_KINDS: ReadonlySet<IntegrationField["kind"]> = new Set([
  "text",
  "url",
]);

const shownValueOf = (
  field: IntegrationField,
  held: string | null
): string | null => {
  if (held === null || isSecretField(field.kind)) {
    return null;
  }

  return environmentOwns(field.key) && MASKED_KINDS.has(field.kind)
    ? maskEnvironmentValue(held)
    : held;
};

const describeField = (field: IntegrationField, stored: StoredSettings) => {
  const held = heldValue(field.key, stored);

  return {
    key: field.key,
    kind: field.kind,
    present: held !== null,
    required: field.required,
    source: sourceFor(field.key, stored),
    value: shownValueOf(field, held),
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

const integrationInput = z.object({
  integrationId: z.string(),
  values: z.record(z.string(), z.string()),
  variantId: z.string(),
});

type IntegrationRequest = z.infer<typeof integrationInput>;

const environmentPicksAnotherVariant = (
  integration: Integration,
  variant: IntegrationVariant
): boolean =>
  environmentOwns(integration.discriminantKey) &&
  process.env[integration.discriminantKey] !== variant.discriminantValue;

const prepareIntegration = async (request: IntegrationRequest) => {
  const integration = Option.getOrThrowWith(
    findIntegration(request.integrationId),
    () => new ORPCError("NOT_FOUND", { message: "Unknown integration" })
  );

  const variant = Option.getOrThrowWith(
    findVariant(integration, request.variantId),
    () => new ORPCError("NOT_FOUND", { message: "Unknown variant" })
  );

  if (environmentPicksAnotherVariant(integration, variant)) {
    return {
      kind: "refused" as const,
      refusal: {
        keys: [integration.discriminantKey],
        outcome: "environment-owned" as const,
      },
    };
  }

  const stored = await readCurrentSettings();
  const candidate = candidateOf(
    integration,
    variant,
    request.values,
    stored,
    environmentOwns
  );

  const missing = missingKeysOf(variant, candidate, environmentOwns);

  if (missing.length > 0) {
    return {
      kind: "refused" as const,
      refusal: { keys: missing, outcome: "missing-fields" as const },
    };
  }

  const validated = validateSettings(candidate);

  if (Result.isFailure(validated)) {
    return {
      kind: "refused" as const,
      refusal: {
        detail: validated.failure.detail,
        outcome: "invalid" as const,
      },
    };
  }

  return {
    candidate,
    integration,
    kind: "ready" as const,
    validated: validated.success,
    variant,
  };
};

export const instanceRouter = {
  check: operatorProcedure
    .input(integrationInput)
    .handler(async ({ input }) => {
      const prepared = await prepareIntegration(input);

      if (prepared.kind === "refused") {
        return prepared.refusal;
      }

      const probe = Option.getOrThrowWith(
        findProbe(prepared.integration.id, prepared.variant.id),
        () => new ORPCError("NOT_IMPLEMENTED", { message: "No check exists" })
      );

      const probed = await Effect.runPromise(
        Effect.result(probe(prepared.validated))
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

      return { outcome: "verified" as const };
    }),

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
    .input(integrationInput)
    .handler(async ({ context, input }) => {
      const prepared = await prepareIntegration(input);

      if (prepared.kind === "refused") {
        return prepared.refusal;
      }

      if (
        isWhollyOwnedByEnvironment(
          prepared.integration,
          prepared.variant,
          environmentOwns
        )
      ) {
        return { outcome: "nothing-to-save" as const };
      }

      await Effect.runPromise(
        writeStoredSettings(
          settings.BETTER_AUTH_SECRET,
          writesOf(prepared.integration, prepared.candidate, environmentOwns),
          context.session.user.id
        )
      );

      return { outcome: "saved" as const, restartRequired: true };
    }),

  status: publicProcedure.handler(() => Effect.runPromise(readSetupState())),
};
