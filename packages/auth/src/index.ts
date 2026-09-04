import { passkey } from "@better-auth/passkey";
import { createPrismaClient } from "@freenary/db";
import { isEmailEnabled } from "@freenary/email";
import { env } from "@freenary/env/server";
import type { BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import {
  emailOTP,
  genericOAuth,
  haveIBeenPwned,
  twoFactor,
} from "better-auth/plugins";

import { resolveCookiePolicy } from "./cookies";
import { sendOtpEmail } from "./emails";
import {
  DISABLED_OTP_TYPES,
  DISABLED_PATHS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  OTP_ALLOWED_ATTEMPTS,
  OTP_EXPIRY_SECONDS,
  OTP_ISSUING_PATH,
  OTP_LENGTH,
  RATE_LIMIT_DEFAULT,
  RATE_LIMIT_RULES,
  REAUTH_PATHS,
  REAUTH_WINDOW_SECONDS,
  SESSION_EXPIRY_SECONDS,
  TRUSTED_DEVICE_SECONDS,
} from "./policy";
import {
  appleTrustedOrigins,
  genericOAuthProviders,
  socialProviders,
} from "./providers";

export type { AuthCapabilities, OAuthProviderDescriptor } from "./providers";
export { authCapabilities } from "./providers";
export { resolveCookiePolicy } from "./cookies";

const APP_NAME = "Freenary";

/**
 * WebAuthn binds a credential to the origin that created it, which is the web
 * app rather than this API. The relying party is therefore the web app's
 * hostname, and a credential registered on one deployment cannot be replayed
 * against another.
 */
const webOrigin = new URL(env.CORS_ORIGIN);

const buildPlugins = (): BetterAuthPlugin[] => {
  const plugins: BetterAuthPlugin[] = [
    twoFactor({
      issuer: APP_NAME,
      trustDeviceMaxAge: TRUSTED_DEVICE_SECONDS,
    }),
    passkey({
      origin: env.CORS_ORIGIN,
      rpID: webOrigin.hostname,
      rpName: APP_NAME,
    }),
  ];

  if (isEmailEnabled) {
    plugins.push(
      emailOTP({
        allowedAttempts: OTP_ALLOWED_ATTEMPTS,
        expiresIn: OTP_EXPIRY_SECONDS,
        otpLength: OTP_LENGTH,
        // Makes email verification and password reset run on codes rather than
        // on links: a link is pre-fetched by mail clients and breaks across
        // devices, and this way there is one delivery path to keep working.
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: (data) =>
          sendOtpEmail(data.email, data.otp, data.type),
        // A database dump must not contain codes that still open accounts.
        storeOTP: "hashed",
      })
    );
  }

  if (genericOAuthProviders.length > 0) {
    plugins.push(genericOAuth({ config: genericOAuthProviders }));
  }

  if (env.AUTH_PASSWORD_BREACH_CHECK) {
    plugins.push(haveIBeenPwned());
  }

  return plugins;
};

/**
 * One `before` hook for the policies Better Auth cannot express in options:
 * routes and code purposes this deployment does not offer, and the narrower
 * re-authentication window over changing which identities open the account.
 * Better Auth guards `/unlink-account` with `session.freshAge` but leaves
 * `/link-social` on a plain session check, and both change the same thing.
 */
const enforceAuthPolicy = createAuthMiddleware(async (ctx) => {
  if (Object.hasOwn(DISABLED_PATHS, ctx.path)) {
    throw APIError.from("NOT_FOUND", {
      code: "NOT_FOUND",
      message: "Not found",
    });
  }

  if (
    ctx.path === OTP_ISSUING_PATH &&
    Object.hasOwn(DISABLED_OTP_TYPES, String(ctx.body?.type))
  ) {
    throw APIError.from("BAD_REQUEST", {
      code: "INVALID_OTP_TYPE",
      message: "Invalid OTP type",
    });
  }

  if (!Object.hasOwn(REAUTH_PATHS, ctx.path)) {
    return;
  }

  const session = await getSessionFromCtx(ctx);
  if (!session?.session) {
    throw APIError.from("UNAUTHORIZED", {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const age = Date.now() - new Date(session.session.createdAt).getTime();
  if (age >= REAUTH_WINDOW_SECONDS * 1000) {
    throw APIError.from("FORBIDDEN", {
      code: "SESSION_NOT_FRESH",
      message: "Session is not fresh",
    });
  }
});

export const createAuth = () => {
  const prisma = createPrismaClient();

  return betterAuth({
    account: {
      accountLinking: {
        // One person, one account — but only when the provider proves the
        // address and the local row is already verified, so pre-registering an
        // unverified account at someone else's address links nothing.
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        enabled: true,
      },
    },

    advanced: {
      // A declared parent domain is what lets both origins share one Lax
      // cookie; without it a split-subdomain deployment falls back to None.
      crossSubDomainCookies:
        env.AUTH_COOKIE_DOMAIN === undefined
          ? undefined
          : { domain: env.AUTH_COOKIE_DOMAIN, enabled: true },
      defaultCookieAttributes: resolveCookiePolicy(
        env.BETTER_AUTH_URL,
        env.CORS_ORIGIN,
        env.NODE_ENV === "production",
        env.AUTH_COOKIE_DOMAIN
      ),
      // Better Auth refuses a multi-hop `x-forwarded-for` without this list and
      // keys every caller into one bucket, which would cap the deployment
      // instead of the caller on every rule below.
      ipAddress: { trustedProxies: env.TRUSTED_PROXIES },
    },

    appName: APP_NAME,

    baseURL: env.BETTER_AUTH_URL,

    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    emailAndPassword: {
      enabled: true,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      // Demanded only where a code can actually be delivered. It is also what
      // makes sign-up answer identically for a taken and a free address.
      requireEmailVerification: isEmailEnabled,
    },

    emailVerification: {
      autoSignInAfterVerification: true,
      // Confirming an address mints a session, and the route neither checks
      // nor changes anything for an address that is already confirmed. Without
      // this refusal an emailed code would sign in past both the password and
      // the second factor, which is the one thing this deployment does not
      // allow. `user` still carries the pre-update flag here.
      beforeEmailVerification: (user) => {
        if (user.emailVerified) {
          throw APIError.from("BAD_REQUEST", {
            code: "INVALID_OTP",
            message: "Invalid code",
          });
        }
        return Promise.resolve();
      },
      expiresIn: OTP_EXPIRY_SECONDS,
      // A sign-in blocked for want of confirmation lands the user on the code
      // step, so send the code with the refusal rather than making them ask.
      // Fires only after the password verifies, so it is not a spray vector.
      sendOnSignIn: true,
    },

    hooks: {
      before: enforceAuthPolicy,
    },

    plugins: buildPlugins(),

    rateLimit: {
      customRules: RATE_LIMIT_RULES,
      // On in development too: a limiter that only exists in production is one
      // nobody has ever seen work.
      enabled: env.NODE_ENV !== "test",
      max: RATE_LIMIT_DEFAULT.max,
      storage: "database",
      window: RATE_LIMIT_DEFAULT.window,
    },

    secret: env.BETTER_AUTH_SECRET,

    session: {
      expiresIn: SESSION_EXPIRY_SECONDS,
      // Matched to the lifetime rather than left at its 24-hour default: it
      // gates `/list-sessions`, and a session's `createdAt` never moves, so the
      // shorter default breaks the active-sessions screen for six days out of
      // seven. It also gates `/unlink-account`, both halves of passkey
      // registration and `/delete-user`; the first three take their narrower
      // window from `REAUTH_PATHS`, and enabling user deletion means adding it
      // there too rather than relying on a gate this line has made inert.
      freshAge: SESSION_EXPIRY_SECONDS,
    },

    socialProviders,

    trustedOrigins: [env.CORS_ORIGIN, ...appleTrustedOrigins],

    user: {
      additionalFields: {
        country: {
          required: false,
          type: "string",
        },
        onboardingCompletedAt: {
          required: false,
          type: "date",
        },
      },
    },
  });
};

export const auth = createAuth();
