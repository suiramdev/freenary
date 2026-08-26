import prisma from "@freenary/db";
import { env } from "@freenary/env/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  exchangeBankCode,
  getAvailableBanks,
  isEnableBankingConfigured,
  startBankConnection,
} from "../lib/enable-banking";

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

  getAvailableBanks: protectedProcedure
    .input(z.object({ country: z.string() }))
    .handler(async ({ input }) => {
      const banks = await getAvailableBanks(input.country);
      return { banks };
    }),

  getEnableBankingAvailability: protectedProcedure.handler(() => ({
    available: isEnableBankingConfigured(),
  })),

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

export const bankConnectionRouter = {
  exchangeCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .handler(async ({ input }) => {
      const result = await exchangeBankCode(input.code);
      return result;
    }),

  startConnection: protectedProcedure
    .input(
      z.object({
        bankCountry: z.string(),
        bankName: z.string(),
        state: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const redirectUrl = `${env.CORS_ORIGIN}/callback/enable-banking`;
      const result = await startBankConnection({
        bankCountry: input.bankCountry,
        bankName: input.bankName,
        redirectUrl,
        state: input.state,
      });
      return result;
    }),
};
