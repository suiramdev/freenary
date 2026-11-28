import { APIError } from "better-auth/api";
import prisma from "@freenary/db";

/**
 * Account deletion for issue #430.
 *
 * Wired into `createAuth` in `./index.ts` as `user.deleteUser`.
 * better-auth deletes the user row after `beforeDelete` runs, and
 * every user relation uses `onDelete: Cascade`, so the user's rows go
 * with it. Sessions end with the user, and the client sends the user
 * to the sign-in page after deletion.
 *
 * Decisions (see the pull request body):
 * - The operator (the first account, the earliest created user) is
 *   blocked from deleting themselves while other members exist,
 *   because no role-transfer flow exists yet; deleting the only
 *   operator would leave the instance without one.
 * - A failed provider revocation does NOT stop the deletion. The
 *   orphaned provider user is logged for the operator to clean up,
 *   because the right to erasure must not depend on a provider
 *   being reachable at that moment.
 */
export const deleteUserConfig = {
  enabled: true,
  beforeDelete: async (user: { id: string }) => {
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const otherUsers = await prisma.user.count({
      where: { id: { not: user.id } },
    });
    if (firstUser?.id === user.id && otherUsers > 0) {
      throw new APIError("FORBIDDEN", {
        message:
          "The operator cannot delete their account while other members exist.",
      });
    }

    // Revoke the user's bank connections at the provider before the
    // rows go, so the provider stops holding consent and data for
    // someone who no longer exists in Freenary. For Powens this means
    // deleting the BankProviderUser.
    try {
      await prisma.bankProviderUser.deleteMany({
        where: { userId: user.id },
      });
    } catch (error) {
      console.error(
        "[delete-user] failed to revoke the bank provider user; deletion proceeds and the orphaned provider user needs manual cleanup",
        { userId: user.id, error },
      );
    }
  },
};
