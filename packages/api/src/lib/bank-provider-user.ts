import prisma, { Prisma } from "@freenary/db";

import type { BankingProvider, ProviderUserSession } from "../providers/types";

/**
 * A provider that scopes its data per user (Powens) needs an identity created
 * at the provider before anything can be connected. The core owns that row so
 * adapters stay free of the database; providers without `createUser` have none.
 */
export const findProviderUser = async (
  userId: string,
  provider: BankingProvider
): Promise<ProviderUserSession | null> => {
  if (!provider.createUser) {
    return null;
  }

  const row = await prisma.bankProviderUser.findUnique({
    select: { accessToken: true, providerUserId: true },
    where: { userId_provider: { provider: provider.id, userId } },
  });
  return row
    ? { accessToken: row.accessToken, providerUserId: row.providerUserId }
    : null;
};

export const ensureProviderUser = async (
  userId: string,
  provider: BankingProvider
): Promise<ProviderUserSession | null> => {
  const existing = await findProviderUser(userId, provider);
  if (existing || !provider.createUser) {
    return existing;
  }

  const session = await provider.createUser();
  try {
    await prisma.bankProviderUser.create({
      data: {
        accessToken: session.accessToken,
        provider: provider.id,
        providerUserId: session.providerUserId,
        userId,
      },
    });
    return session;
  } catch (error) {
    // Two tabs starting a connection at once each create a provider user; keep
    // the stored one and drop this duplicate, which holds no data yet.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return await findProviderUser(userId, provider);
    }
    throw error;
  }
};

/**
 * Drops the provider identity once the user has no connection left with that
 * provider. Deleting it at the provider is best effort, like closing a
 * connection: the local row goes either way.
 */
export const releaseProviderUser = async (
  userId: string,
  provider: BankingProvider
): Promise<void> => {
  const { deleteUser } = provider;
  if (!deleteUser) {
    return;
  }

  const remaining = await prisma.bankConnection.count({
    where: { provider: provider.id, userId },
  });
  if (remaining > 0) {
    return;
  }

  const session = await findProviderUser(userId, provider);
  if (!session) {
    return;
  }

  try {
    await deleteUser(session);
  } catch {
    // Best effort: a provider that refuses must not leave a dangling identity.
  }

  await prisma.bankProviderUser.delete({
    where: { userId_provider: { provider: provider.id, userId } },
  });
};
