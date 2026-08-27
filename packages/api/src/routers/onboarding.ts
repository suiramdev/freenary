import prisma from "@freenary/db";
import { env } from "@freenary/env/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { getDefaultProvider } from "../providers/registry";
import type { BankConnectionState } from "./bank-connection-state";
import {
  encodeBankConnectionState,
  findInstitution,
  parseBankConnectionState,
} from "./bank-connection-state";

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
          id: inst.id,
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
    .input(z.object({ code: z.string(), state: z.string() }))
    .handler(async ({ context, input }) => {
      const provider = getDefaultProvider();
      let connectionState: BankConnectionState;
      try {
        connectionState = parseBankConnectionState(input.state);
      } catch {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid bank connection state",
        });
      }
      if (connectionState.providerId !== provider.id) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid banking provider in connection state",
        });
      }

      const institutions = await provider.listInstitutions(
        connectionState.institution.country
      );
      const institution = findInstitution(
        institutions,
        connectionState.institution.id,
        connectionState.institution.country
      );
      if (!institution) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Bank institution is no longer available",
        });
      }

      const result = await provider.completeConnection(input.code);
      const providerInstitutionName = result.institutionName.trim();
      const bankName = providerInstitutionName || institution.name;

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
        institutionId: z.string(),
        state: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const provider = getDefaultProvider();
      const institutions = await provider.listInstitutions(input.bankCountry);
      const institution = findInstitution(
        institutions,
        input.institutionId,
        input.bankCountry
      );
      if (!institution) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Unknown bank institution",
        });
      }

      const redirectUrl = `${env.CORS_ORIGIN}/callback/enable-banking`;
      const encodedState = encodeBankConnectionState(
        provider.id,
        institution,
        input.state
      );
      const result = await provider.startConnection({
        country: input.bankCountry,
        institutionId: institution.id,
        redirectUrl,
        state: encodedState,
      });
      return result;
    }),
};
