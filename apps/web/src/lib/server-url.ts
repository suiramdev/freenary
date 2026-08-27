import { isServer } from "@/lib/is-server";

/**
 * Resolves the absolute origin of the API server, on both sides of SSR.
 * A relative `VITE_SERVER_URL` is joined onto the current deployment origin.
 */
export const getServerUrl = (url: string) => {
  // SAFETY: globalThis may carry a Node-style process.env; the cast only widens it to that optional shape
  const globalWithProcess = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const processEnv = globalWithProcess.process?.env;
  if (isServer && processEnv?.SERVER_URL) {
    return processEnv.SERVER_URL.endsWith("/")
      ? processEnv.SERVER_URL.slice(0, -1)
      : processEnv.SERVER_URL;
  }

  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

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
