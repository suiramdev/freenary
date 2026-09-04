// Per-worktree dev-stack identity. A single slug — derived from the git branch
// (unique per worktree, since git forbids checking out one branch in two
// worktrees), with a directory-name fallback and an explicit override — drives
// the Compose project name, the OrbStack hostnames, and the CORS/auth/API URLs.
// Keeping them mutually consistent is what lets several worktrees run at once
// without container-name, OrbStack-domain, or CORS collisions.

export interface DevIdentityInput {
  /** Current git branch; null/empty when HEAD is detached. */
  branch?: string | null;
  /** Worktree directory basename — the detached-HEAD fallback. */
  dir?: string | null;
  /** Explicit FREENARY_SLUG override — highest precedence. */
  slugOverride?: string | null;
}

export interface DevIdentity {
  slug: string;
  /** Compose project name; namespaces containers, network, and volumes per worktree. */
  composeProjectName: string;
  webHost: string;
  serverHost: string;
  docsHost: string;
  /** Allowed browser origin for the API — always the web URL, so CORS matches. */
  corsOrigin: string;
  betterAuthUrl: string;
  viteServerUrl: string;
  /** Parent domain of the web and server hosts, as `AUTH_COOKIE_DOMAIN`. */
  cookieDomain: string;
  /** Browser URL for the documentation site; no CORS or auth relationship. */
  docsUrl: string;
}

const DEFAULT_SLUG = "dev";
// Keep each derived DNS label well under the 63-char limit, with room for the
// `web.<slug>.freenary.orb.local` prefix and suffix.
const MAX_SLUG_LENGTH = 40;
const PROJECT_PREFIX = "freenary";
const ORBSTACK_SUFFIX = "freenary.orb.local";

const NON_LABEL_RUN = /[^a-z0-9]+/gu;
const EDGE_DASHES = /^-+|-+$/gu;
const TRAILING_DASHES = /-+$/gu;

// Reduce an arbitrary ref/name to one DNS-safe label (lowercase, non-alphanumeric
// runs collapsed to single dashes, trimmed, length-capped), or "" when nothing
// survives.
const slugify = (raw: string | null | undefined): string => {
  if (!raw) {
    return "";
  }
  return raw
    .toLowerCase()
    .replace(NON_LABEL_RUN, "-")
    .replace(EDGE_DASHES, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(TRAILING_DASHES, "");
};

export const deriveDevIdentity = (input: DevIdentityInput): DevIdentity => {
  // Precedence: explicit override -> branch -> directory -> constant default.
  const slug =
    slugify(input.slugOverride) ||
    slugify(input.branch) ||
    slugify(input.dir) ||
    DEFAULT_SLUG;

  const webHost = `web.${slug}.${ORBSTACK_SUFFIX}`;
  const serverHost = `server.${slug}.${ORBSTACK_SUFFIX}`;
  const docsHost = `docs.${slug}.${ORBSTACK_SUFFIX}`;
  // The parent both origins sit under, so the browser sends the session
  // cookie to the web app as well and its server can resolve the visitor.
  const cookieDomain = `.${slug}.${ORBSTACK_SUFFIX}`;

  return {
    betterAuthUrl: `https://${serverHost}`,
    composeProjectName: `${PROJECT_PREFIX}-${slug}`,
    cookieDomain,
    corsOrigin: `https://${webHost}`,
    docsHost,
    docsUrl: `https://${docsHost}`,
    serverHost,
    slug,
    viteServerUrl: `https://${serverHost}`,
    webHost,
  };
};
