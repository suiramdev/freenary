import prisma from "@freenary/db";
import { z } from "zod";

import { protectedProcedure } from "../index";

const isoAlpha2CountryCode = z
  .string()
  .regex(/^[A-Z]{2}$/u, "Expected an ISO 3166-1 alpha-2 country code");

export const onboardingRouter = {
  completeOnboarding: protectedProcedure
    .input(z.object({ taxCountries: z.array(isoAlpha2CountryCode).min(1) }))
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
