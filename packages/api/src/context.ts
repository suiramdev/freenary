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
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
