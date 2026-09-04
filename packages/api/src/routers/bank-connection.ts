import prisma from "@freenary/db";
import { env } from "@freenary/env/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  findProviderUser,
  ensureProviderUser,
  releaseProviderUser,
} from "../lib/bank-provider-user";
import { getDefaultProvider, getProvider } from "../providers/registry";
import type { BankingProvider } from "../providers/types";
import type { BankConnectionState } from "./bank-connection-state";
import {
  BANK_CONNECTION_RETURN_TARGETS,
  encodeBankConnectionState,
  findInstitution,
  parseBankConnectionState,
  verifyBankConnectionState,
} from "./bank-connection-state";

/** The provider a callback names, refusing an id this build does not carry. */
const resolveProvider = (providerId: string): BankingProvider => {
  try {
    return getProvider(providerId);
  } catch {
    throw new ORPCError("NOT_FOUND", { message: "Unknown banking provider" });
  }
};

/**
 * Resolves the signed state a provider hands back, refusing anything that is
 * not this session's own in-flight connection.
 */
const readConnectionState = (
  state: string,
  providerId: string,
  userId: string
): BankConnectionState => {
  let connectionState: BankConnectionState;
  try {
    connectionState = parseBankConnectionState(state);
  } catch {
    throw new ORPCError("BAD_REQUEST", {
      message: "Invalid bank connection state",
    });
  }
  if (connectionState.providerId !== providerId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Invalid banking provider in connection state",
    });
  }
  if (
    !verifyBankConnectionState(connectionState, userId, env.BETTER_AUTH_SECRET)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Bank connection state does not belong to this session",
    });
  }
  return connectionState;
};

export const bankConnectionRouter = {
  disconnect: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const connection = await prisma.bankConnection.findFirst({
        select: {
          _count: { select: { accounts: true } },
          id: true,
          institutionName: true,
          provider: true,
          providerSessionId: true,
        },
        where: { id: input.connectionId, userId },
      });
      if (!connection) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bank connection not found",
        });
      }

      // Ask the provider to revoke first so the bank-side consent stops too,
      // but never let a failure there block the user from deleting their data.
      const provider = getProvider(connection.provider);
      const providerUser = await findProviderUser(userId, provider);
      const revocationRequested = provider.isConfigured()
        ? await provider
            .closeConnection({
              providerSessionId: connection.providerSessionId,
              user: providerUser,
            })
            .then(() => true)
            .catch(() => false)
        : false;

      // Accounts, transactions and holdings go with it through the FK cascade.
      await prisma.bankConnection.delete({ where: { id: connection.id } });

      // The provider identity outlives no connection: the last one taking it
      // away is what closes the account at the provider.
      await releaseProviderUser(userId, provider);

      return {
        accountsRemoved: connection._count.accounts,
        institutionName: connection.institutionName,
        revocationRequested,
      };
    }),

  exchangeCode: protectedProcedure
    .input(
      z.object({
        params: z.record(z.string(), z.string()),
        providerId: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const provider = resolveProvider(input.providerId);
      const userId = context.session.user.id;
      const { state } = input.params;
      if (!state) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Missing bank connection state",
        });
      }
      const connectionState = readConnectionState(state, provider.id, userId);

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

      // A per-user provider needs its stored identity: the callback carries a
      // connection id that only means anything under that user's token.
      const providerUser = await findProviderUser(userId, provider);
      if (!providerUser && provider.createUser) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No provider session for this user",
        });
      }

      const result = await provider.completeConnection({
        callbackParams: input.params,
        user: providerUser,
      });
      const providerInstitutionName = result.institutionName.trim();
      const bankName = providerInstitutionName || institution.name;

      // One transaction: a connection whose accounts failed to write would
      // still list as linked, with nothing under it.
      const connection = await prisma.$transaction(async (db) => {
        const created = await db.bankConnection.create({
          data: {
            institutionBic: institution.bic ?? null,
            institutionCountry: institution.country,
            institutionGroup:
              result.institutionGroup ?? institution.group ?? null,
            institutionId: institution.id,
            institutionName: bankName,
            provider: provider.id,
            providerSessionId: result.providerSessionId,
            userId,
          },
        });

        await db.bankAccount.createMany({
          data: result.accounts.map((account) => ({
            connectionId: created.id,
            iban: account.iban ?? null,
            identificationHash: account.identificationHash ?? null,
            name: account.name ?? null,
            providerAccountId: account.providerAccountId,
          })),
        });

        return created;
      });

      return {
        accounts: result.accounts.map((a) => ({
          iban: a.iban,
          name: a.name,
          uid: a.providerAccountId,
        })),
        connectionId: connection.id,
        institutionName: bankName,
        returnTo: connectionState.returnTo,
        sessionId: result.providerSessionId,
      };
    }),

  getProviderAvailability: protectedProcedure.handler(() => ({
    available: getDefaultProvider().isConfigured(),
  })),

  /**
   * The linked banks a user actually has. A row exists only once
   * `exchangeCode` completed, so this is what "connected" means in the UI.
   */
  listConnections: protectedProcedure.handler(async ({ context }) => {
    const connections = await prisma.bankConnection.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        accounts: {
          orderBy: { createdAt: "asc" },
          select: { iban: true, id: true, name: true },
        },
        id: true,
        institutionId: true,
        institutionName: true,
        lastSyncedAt: true,
        status: true,
      },
      where: { userId: context.session.user.id },
    });

    return { connections };
  }),

  /**
   * Institutions the provider can link in a country. Onboarding passes the
   * country being picked; elsewhere the user's own country is the answer.
   */
  listInstitutions: protectedProcedure
    .input(z.object({ country: z.string().optional() }))
    .handler(async ({ context, input }) => {
      let { country } = input;
      if (!country) {
        const user = await prisma.user.findUniqueOrThrow({
          select: { country: true },
          where: { id: context.session.user.id },
        });
        country = user.country ?? undefined;
      }
      if (!country) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No country to list banks for",
        });
      }

      const institutions = await getDefaultProvider().listInstitutions(country);
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

  startConnection: protectedProcedure
    .input(
      z.object({
        bankCountry: z.string(),
        institutionId: z.string(),
        returnTo: z.enum(BANK_CONNECTION_RETURN_TARGETS),
        state: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
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

      // The provider identity has to exist before the webview opens: it is what
      // scopes the connection the callback comes back with.
      const providerUser = await ensureProviderUser(userId, provider);
      const redirectUrl = `${env.CORS_ORIGIN}${provider.callbackPath}`;
      const encodedState = encodeBankConnectionState(
        provider.id,
        institution,
        userId,
        env.BETTER_AUTH_SECRET,
        input.returnTo,
        input.state
      );
      const result = await provider.startConnection({
        country: input.bankCountry,
        institutionId: institution.id,
        redirectUrl,
        state: encodedState,
        user: providerUser,
      });
      return result;
    }),
};
