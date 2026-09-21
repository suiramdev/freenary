import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";

export type AuthCapabilities =
  InferRouterOutputs<AppRouter>["auth"]["capabilities"];

export type OauthProvider = AuthCapabilities["oauth"][number];
