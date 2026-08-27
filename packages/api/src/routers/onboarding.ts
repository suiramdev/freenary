import prisma from "@freenary/db";
import { env } from "@freenary/env/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { getDefaultProvider } from "../providers/registry";

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

  getAvailableBanks: protectedProcedure
    .input(z.object({ country: z.string() }))
    .handler(async ({ input }) => {
      const provider = getDefaultProvider();
      const institutions = await provider.listInstitutions(input.country);
      return {
        banks: institutions.map((inst) => ({
          bic: inst.bic ?? null,
          country: inst.country,
          logo: inst.logoUrl ?? null,
          name: inst.name,
        })),
      };
    }),

  getEnableBankingAvailability: protectedProcedure.handler(() => ({
    available: getDefaultProvider().isConfigured(),
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
    .input(z.object({ code: z.string(), state: z.string().optional() }))
    .handler(async ({ context, input }) => {
      const provider = getDefaultProvider();
      const result = await provider.completeConnection(input.code);

      let bankName = result.institutionName || "Unknown";
      if (input.state) {
        try {
          // SAFETY: input.state is a JSON string serialized by the client; parsed shape is validated by optional chaining
          const parsed = JSON.parse(input.state) as { bankName?: string };
          bankName = parsed.bankName ?? bankName;
        } catch {
          // state was not JSON — use as-is
        }
      }

      const userId = context.session.user.id;

      const connection = await prisma.bankConnection.create({
        data: {
          institutionName: bankName,
          provider: provider.id,
          providerSessionId: result.providerSessionId,
          userId,
        },
      });

      await prisma.bankAccount.createMany({
        data: result.accounts.map((account) => ({
          connectionId: connection.id,
          iban: account.iban ?? null,
          name: account.name ?? null,
          providerAccountId: account.providerAccountId,
        })),
      });

      return {
        accounts: result.accounts.map((a) => ({
          iban: a.iban,
          name: a.name,
          uid: a.providerAccountId,
        })),
        sessionId: result.providerSessionId,
      };
    }),

  startConnection: protectedProcedure
    .input(
      z.object({
        bankCountry: z.string(),
        bankName: z.string(),
        state: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const provider = getDefaultProvider();
      const redirectUrl = `${env.CORS_ORIGIN}/callback/enable-banking`;
      const stateObj = input.state
        ? { bankName: input.bankName, original: input.state }
        : { bankName: input.bankName };
      const encodedState = JSON.stringify(stateObj);
      const result = await provider.startConnection({
        country: input.bankCountry,
        institutionId: input.bankName,
        redirectUrl,
        state: encodedState,
      });
      return result;
    }),
};
