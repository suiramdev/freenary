import { createHash, randomBytes } from "node:crypto";

import prisma from "@freenary/db";
import { Data, Effect, Option } from "effect";

const SETUP_TOKEN_BYTES = 24;
const SETUP_ROW_ID = "singleton";
const OPERATOR_ROLE = "OPERATOR";

export interface SetupState {
  readonly claimed: boolean;
  readonly completed: boolean;
}

export class SetupClaimRefused extends Data.TaggedError("SetupClaimRefused")<{
  readonly userId: string;
}> {}

const hashOf = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const readSetupState = Effect.fn("instanceConfig.readSetupState")(
  function* readSetupState() {
    const row = yield* Effect.promise(() =>
      prisma.instanceSetup.findUnique({
        select: { claimedAt: true, completedAt: true },
        where: { id: SETUP_ROW_ID },
      })
    );

    return {
      claimed: (row?.claimedAt ?? null) !== null,
      completed: (row?.completedAt ?? null) !== null,
    } satisfies SetupState;
  }
);

export const issueSetupToken = Effect.fn("instanceConfig.issueSetupToken")(
  function* issueSetupToken() {
    const { claimed } = yield* readSetupState();

    if (claimed) {
      return Option.none<string>();
    }

    const token = randomBytes(SETUP_TOKEN_BYTES).toString("base64url");

    yield* Effect.promise(() =>
      prisma.instanceSetup.upsert({
        create: { id: SETUP_ROW_ID, tokenHash: hashOf(token) },
        update: { tokenHash: hashOf(token) },
        where: { id: SETUP_ROW_ID },
      })
    );

    return Option.some(token);
  }
);

export const redeemSetupToken = Effect.fn("instanceConfig.redeemSetupToken")(
  function* redeemSetupToken(token: string, userId: string) {
    const claimed = yield* Effect.promise(() =>
      prisma.$transaction(async (tx) => {
        const taken = await tx.instanceSetup.updateMany({
          data: { claimedAt: new Date(), tokenHash: null },
          where: {
            claimedAt: null,
            id: SETUP_ROW_ID,
            tokenHash: hashOf(token),
          },
        });

        if (taken.count === 0) {
          return false;
        }

        await tx.user.update({
          data: { role: OPERATOR_ROLE },
          where: { id: userId },
        });

        return true;
      })
    );

    if (!claimed) {
      return yield* new SetupClaimRefused({ userId });
    }
  }
);

export const markSetupComplete = Effect.fn("instanceConfig.markSetupComplete")(
  function* markSetupComplete() {
    yield* Effect.promise(() =>
      prisma.instanceSetup.updateMany({
        data: { completedAt: new Date() },
        where: { completedAt: null, id: SETUP_ROW_ID },
      })
    );
  }
);
