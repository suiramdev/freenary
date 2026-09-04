import { passkeyClient } from "@better-auth/passkey/client";
import { env } from "@freenary/env/web";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getServerUrl } from "@/lib/server-url";

export const authClient = createAuthClient({
  // better-auth derives its route-matching base from this URL's path, so the
  // public auth path must equal the server-side mount (/api/auth everywhere)
  baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString(),
  // `emailOTPClient` is here for address confirmation and password reset only —
  // the server refuses `/sign-in/email-otp`, because every account signs in
  // with a password. Google, Apple and the generic OIDC provider all go through
  // `signIn.social`; the generic-oauth plugin registers itself as a social
  // provider, so it needs no client counterpart.
  plugins: [emailOTPClient(), twoFactorClient(), passkeyClient()],
});
