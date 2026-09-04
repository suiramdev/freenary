import { auth } from "@freenary/auth";
import type { Context as ElysiaContext } from "elysia";

export interface CreateContextOptions {
  context: ElysiaContext;
}

export const createContext = async ({ context }: CreateContextOptions) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return {
    auth: null,
    // Kept for procedures that must rate-limit by caller, which needs the
    // forwarded-for chain the session row does not carry.
    headers: context.request.headers,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
