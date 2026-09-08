import { env } from "@freenary/env/web";

import { DOCS_SITE_URL } from "@/lib/constants";

const RELEASE = /^(?<major>\d+)\.(?<minor>\d+)\.\d+$/u;

/**
 * The documentation matching this build. `dev`, `main` and a pre-release
 * describe unreleased code, which the site publishes as `next`.
 */
export const docsUrl = (): string => {
  const groups = RELEASE.exec(env.VITE_FREENARY_VERSION ?? "")?.groups;
  const version = groups ? `${groups.major}.${groups.minor}` : "next";
  return `${DOCS_SITE_URL}/docs/${version}`;
};
