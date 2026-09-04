import { authCapabilities } from "@freenary/auth";
import { ACCOUNT_EXISTS_RATE_LIMIT } from "@freenary/auth/policy";
import prisma from "@freenary/db";
import { z } from "zod";

import { publicProcedure } from "../index";
import { callerBucket, consumeRateLimit } from "../lib/rate-limit";

export const authRouter = {
  /**
   * Whether an address already has an account, so the sign-in form can reveal
   * a password field or a full sign-up. The answer is readable by anyone who
   * can call this — unavoidable while the form works this way — so it is
   * capped per caller and the cap is the mitigation, not an afterthought.
   */
  accountExists: publicProcedure
    .input(z.object({ email: z.email() }))
    .handler(async ({ context, input }) => {
      await consumeRateLimit(
        `account-exists:${callerBucket(context.headers)}`,
        ACCOUNT_EXISTS_RATE_LIMIT
      );

      const user = await prisma.user.findUnique({
        select: { id: true },
        // Better Auth stores addresses lowercased, so a mixed-case entry must
        // be folded or the form offers sign-up for an account that exists.
        where: { email: input.email.toLowerCase() },
      });

      return { exists: user !== null };
    }),

  /**
   * Which sign-in doors this deployment opens. Public and unauthenticated by
   * design: it describes the server's configuration, never a given account.
   */
  capabilities: publicProcedure.handler(() => authCapabilities),
};
