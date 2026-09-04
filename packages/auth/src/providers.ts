import { isEmailEnabled } from "@freenary/email";
import { env } from "@freenary/env/server";
import type { BetterAuthOptions } from "better-auth";
import type { GenericOAuthConfig } from "better-auth/plugins";

import { resolveCookiePolicy } from "./cookies";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  OTP_LENGTH,
  TRUSTED_DEVICE_DAYS,
} from "./policy";

/** The one provider id the generic OIDC connector registers itself under. */
const OIDC_PROVIDER_ID = "oidc";

const OIDC_BASE_SCOPES = ["openid", "email", "profile"];

/** Apple posts its callback from its own origin, so it must be trusted for it. */
const APPLE_ORIGIN = "https://appleid.apple.com";

export interface OAuthProviderDescriptor {
  /** Passed back verbatim to `signIn.social`. */
  id: string;
  /**
   * Operator-configured label, or `null` for the providers the web app names
   * itself. Never a translated string — this crosses the API boundary.
   */
  name: string | null;
}

export interface AuthCapabilities {
  /**
   * An email provider is configured, so address confirmation and password reset
   * work. Sign-in never runs on an emailed code — a password is always required.
   */
  emailDelivery: boolean;
  /** The server rejects anything longer, and the form quotes it back. */
  maxPasswordLength: number;
  /** The server rejects anything shorter, so the form must agree. */
  minPasswordLength: number;
  oauth: OAuthProviderDescriptor[];
  /** Digits in every one-time code the server issues. */
  otpLength: number;
  /** Passkeys can be registered and used to sign in. */
  passkey: boolean;
  /**
   * The browser sends the session cookie to the web app's own origin too — one
   * hostname, or a declared `AUTH_COOKIE_DOMAIN`. That is what lets the web
   * app resolve the visitor while it renders a page on the server; without it
   * every page renders signed-out and the browser sorts the visitor out after.
   */
  sessionCookieShared: boolean;
  /** How long "remember this device" skips the second factor for. */
  trustedDeviceDays: number;
}

const google =
  env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined
    ? null
    : {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      };

const apple =
  env.APPLE_CLIENT_ID === undefined || env.APPLE_CLIENT_SECRET === undefined
    ? null
    : {
        appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET,
      };

const oidcName = env.OIDC_PROVIDER_NAME ?? null;

const oidcScopes = [
  ...new Set([
    ...OIDC_BASE_SCOPES,
    ...(env.OIDC_SCOPES?.split(",").map((scope) => scope.trim()) ?? []),
  ]),
].filter((scope) => scope.length > 0);

export const socialProviders: NonNullable<
  BetterAuthOptions["socialProviders"]
> = {};

if (google !== null) {
  socialProviders.google = google;
}
if (apple !== null) {
  socialProviders.apple = apple;
}

export const genericOAuthProviders: GenericOAuthConfig[] = [];

if (env.OIDC_DISCOVERY_URL !== undefined && env.OIDC_CLIENT_ID !== undefined) {
  genericOAuthProviders.push({
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    discoveryUrl: env.OIDC_DISCOVERY_URL,
    name: oidcName ?? OIDC_PROVIDER_ID,
    providerId: OIDC_PROVIDER_ID,
    // The account's identity is the verified `sub` claim, so refuse to register
    // the provider at all when discovery cannot supply the JWKS that proves it.
    requireIdTokenVerification: true,
    scopes: oidcScopes,
  });
}

export const appleTrustedOrigins = apple === null ? [] : [APPLE_ORIGIN];

/** Applied by `createAuth`, and reported through `authCapabilities`. */
export const cookiePolicy = resolveCookiePolicy(
  env.BETTER_AUTH_URL,
  env.CORS_ORIGIN,
  env.NODE_ENV === "production",
  env.AUTH_COOKIE_DOMAIN
);

const oauth: OAuthProviderDescriptor[] = [];

if (google !== null) {
  oauth.push({ id: "google", name: null });
}
if (apple !== null) {
  oauth.push({ id: "apple", name: null });
}
if (genericOAuthProviders.length > 0) {
  oauth.push({ id: OIDC_PROVIDER_ID, name: oidcName });
}

/**
 * What the sign-in screen may offer. Rendering from this rather than from
 * build-time flags is what keeps a provider inert when its credentials are
 * unset, instead of showing a button that fails on click.
 */
export const authCapabilities: AuthCapabilities = {
  emailDelivery: isEmailEnabled,
  maxPasswordLength: MAX_PASSWORD_LENGTH,
  minPasswordLength: MIN_PASSWORD_LENGTH,
  oauth,
  otpLength: OTP_LENGTH,
  passkey: true,
  // `Lax` is the policy's own word for "both origins are one site".
  sessionCookieShared: cookiePolicy.sameSite === "lax",
  trustedDeviceDays: TRUSTED_DEVICE_DAYS,
};
