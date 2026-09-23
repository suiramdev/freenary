import prisma from "@freenary/db";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireOperator = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const account = await prisma.user.findUnique({
    select: { role: true },
    where: { id: context.session.user.id },
  });

  if (account?.role !== "OPERATOR") {
    throw new ORPCError("FORBIDDEN");
  }

  return next({ context: { session: context.session } });
});

export const operatorProcedure = publicProcedure.use(requireOperator);
