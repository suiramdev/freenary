import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";

/** Which sign-in doors this deployment opens. */
export type AuthCapabilities =
  InferRouterOutputs<AppRouter>["auth"]["capabilities"];

/** One configured social or OIDC provider. */
export type OauthProvider = AuthCapabilities["oauth"][number];
