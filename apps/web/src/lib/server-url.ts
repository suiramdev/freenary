import { env } from "@freenary/env/web";

import { isServer } from "@/lib/is-server";

declare global {
  interface Window {
    /**
     * Set by an inline script in the root document before any module script
     * runs, so the browser learns the API origin from the running container
     * rather than from the image build.
     */
    __FREENARY_SERVER_URL__?: string;
  }
}

// SAFETY: globalThis may carry a Node-style process.env; the cast only widens it to that optional shape
const processEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

const stripTrailingSlash = (url: string) =>
  url.endsWith("/") ? url.slice(0, -1) : url;

/**
 * The API origin the browser calls. `PUBLIC_SERVER_URL` in the web server's
 * environment wins at request time, so one image serves any deployment; unset,
 * the build-time `VITE_SERVER_URL` stays in force.
 */
export const getPublicServerUrl = (): string | undefined => {
  if (!isServer) {
    return window.__FREENARY_SERVER_URL__;
  }
  const value = processEnv?.PUBLIC_SERVER_URL;
  if (!value) {
    return undefined;
  }
  if (!URL.canParse(value)) {
    throw new Error(
      `PUBLIC_SERVER_URL must be an absolute URL such as https://api.example.com, got "${value}"`
    );
  }
  return stripTrailingSlash(value);
};

/**
 * Resolves the absolute origin of the API server, on both sides of SSR.
 * A relative `VITE_SERVER_URL` is joined onto the current deployment origin.
 */
export const getServerUrl = (): string => {
  if (isServer && processEnv?.SERVER_URL) {
    return stripTrailingSlash(processEnv.SERVER_URL);
  }

  const publicUrl = getPublicServerUrl();
  if (publicUrl) {
    return publicUrl;
  }

  const normalized = stripTrailingSlash(env.VITE_SERVER_URL);

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (!isServer) {
    return `${window.location.origin}${normalized}`;
  }

  const vercelUrl =
    processEnv?.VERCEL_ENV === "production"
      ? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
      : (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelUrl) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    return `${origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};

/**
 * The inline script that hands `PUBLIC_SERVER_URL` to the browser. The client
 * reads the same value back from the global, so the head matches on both
 * sides of hydration.
 */
export const publicServerUrlScript = (): string | undefined => {
  const url = getPublicServerUrl();
  if (!url) {
    return undefined;
  }
  // `<` cannot appear in an inline script, even inside a string literal.
  const literal = JSON.stringify(url).replaceAll("<", "\\u003c");
  return `window.__FREENARY_SERVER_URL__=${literal}`;
};
