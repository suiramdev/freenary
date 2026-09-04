import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { authRouter } from "./auth";
import { bankConnectionRouter } from "./bank-connection";
import { budgetRouter } from "./budget";
import { onboardingRouter } from "./onboarding";
import { settingsRouter } from "./settings";

export const appRouter = {
  auth: authRouter,
  bankConnection: bankConnectionRouter,
  budget: budgetRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  onboarding: onboardingRouter,
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  settings: settingsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
