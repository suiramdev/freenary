import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { bankConnectionRouter, onboardingRouter } from "./onboarding";

export const appRouter = {
  bankConnection: bankConnectionRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  onboarding: onboardingRouter,
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
