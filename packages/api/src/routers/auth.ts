import { authCapabilities } from "@freenary/auth";
import { ACCOUNT_EXISTS_RATE_LIMIT } from "@freenary/auth/policy";
import prisma from "@freenary/db";
import { z } from "zod";

import { publicProcedure } from "../index";
import { callerBucket, consumeRateLimit } from "../lib/rate-limit";

export const authRouter = {
  accountExists: publicProcedure
    .input(z.object({ email: z.email() }))
    .handler(async ({ context, input }) => {
      await consumeRateLimit(
        `account-exists:${callerBucket(context.headers)}`,
        ACCOUNT_EXISTS_RATE_LIMIT
      );

      const storedEmail = input.email.toLowerCase();
      const user = await prisma.user.findUnique({
        select: { id: true },
        where: { email: storedEmail },
      });

      return { exists: user !== null };
    }),

  capabilities: publicProcedure.handler(() => authCapabilities),

  viewer: publicProcedure.handler(({ context }) => {
    const user = context.session?.user;
    const { sessionCookieShared } = authCapabilities;

    if (user === undefined) {
      return { kind: "guest" as const, sessionCookieShared };
    }

    const hasCompletedOnboarding =
      (user.onboardingCompletedAt ?? null) !== null;

    return {
      kind: "member" as const,
      onboarded: hasCompletedOnboarding,
      sessionCookieShared,
    };
  }),
};
