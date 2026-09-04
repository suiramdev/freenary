import prisma from "@freenary/db";
import { z } from "zod";

import { protectedProcedure } from "../index";

export const onboardingRouter = {
  completeOnboarding: protectedProcedure
    .input(z.object({ country: z.string() }))
    .handler(async ({ context, input }) => {
      await prisma.user.update({
        data: {
          country: input.country,
          onboardingCompletedAt: new Date(),
        },
        where: { id: context.session.user.id },
      });

      return { success: true as const };
    }),

  getStatus: protectedProcedure.handler(async ({ context }) => {
    const user = await prisma.user.findUniqueOrThrow({
      select: { country: true, onboardingCompletedAt: true },
      where: { id: context.session.user.id },
    });

    return {
      completed: user.onboardingCompletedAt !== null,
      country: user.country ?? null,
    };
  }),
};
