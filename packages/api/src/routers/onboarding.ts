import prisma from "@freenary/db";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { taxResidencyCountries } from "../lib/country-code";

export const onboardingRouter = {
  completeOnboarding: protectedProcedure
    .input(z.object({ taxCountries: taxResidencyCountries.min(1) }))
    .handler(async ({ context, input }) => {
      await prisma.user.update({
        data: {
          onboardingCompletedAt: new Date(),
          taxCountries: input.taxCountries,
        },
        where: { id: context.session.user.id },
      });

      return { success: true as const };
    }),

  getStatus: protectedProcedure.handler(async ({ context }) => {
    const user = await prisma.user.findUniqueOrThrow({
      select: { onboardingCompletedAt: true, taxCountries: true },
      where: { id: context.session.user.id },
    });

    return {
      completed: user.onboardingCompletedAt !== null,
      taxCountries: user.taxCountries,
    };
  }),
};
