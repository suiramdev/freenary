import prisma from "@freenary/db";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";

export const onboardingRouter = {
  checkEmail: publicProcedure
    .input(z.object({ email: z.email() }))
    .handler(async ({ input }) => {
      const user = await prisma.user.findUnique({
        select: { id: true },
        where: { email: input.email },
      });
      return { exists: user !== null };
    }),

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
