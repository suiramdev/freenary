import { APIError } from "better-auth/api";
import prisma from "@freenary/db";

// Account deletion for issue #430, wired into `createAuth` in
// `./index.ts` as `user.deleteUser`. better-auth deletes the user row
// after `beforeDelete` runs; every user relation uses
// `onDelete: Cascade`, so the user's rows go with it.
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
    // deleting the BankProviderUser. A failed revocation does not stop
    // the deletion: the orphaned provider user is logged for the
    // operator to clean up, because erasure must not depend on a
    // provider being reachable at that moment.
    await prisma.bankProviderUser
      .deleteMany({ where: { userId: user.id } })
      .catch((error) => {
        console.error(
          "[delete-user] failed to revoke the bank provider user; deletion proceeds and the orphaned provider user needs manual cleanup",
          { userId: user.id, error },
        );
      });
  },
};
