export interface DevIdentityInput {
  branch?: string | null;
  dir?: string | null;
  slugOverride?: string | null;
}

export interface DevIdentity {
  slug: string;
  composeProjectName: string;
  webHost: string;
  serverHost: string;
  docsHost: string;
  mailHost: string;
  corsOrigin: string;
  betterAuthUrl: string;
  viteServerUrl: string;
  cookieDomain: string;
  docsUrl: string;
  mailUrl: string;
}

const DEFAULT_SLUG = "dev";
const MAX_SLUG_LENGTH = 40;
const PROJECT_PREFIX = "freenary";
const ORBSTACK_SUFFIX = "freenary.orb.local";

const NON_LABEL_RUN = /[^a-z0-9]+/gu;
const EDGE_DASHES = /^-+|-+$/gu;
const TRAILING_DASHES = /-+$/gu;

const toDnsLabel = (raw: string | null | undefined): string => {
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
  const slug =
    toDnsLabel(input.slugOverride) ||
    toDnsLabel(input.branch) ||
    toDnsLabel(input.dir) ||
    DEFAULT_SLUG;

  const webHost = `web.${slug}.${ORBSTACK_SUFFIX}`;
  const serverHost = `server.${slug}.${ORBSTACK_SUFFIX}`;
  const docsHost = `docs.${slug}.${ORBSTACK_SUFFIX}`;
  const mailHost = `mail.${slug}.${ORBSTACK_SUFFIX}`;
  const parentDomainOfWebAndServerHosts = `.${slug}.${ORBSTACK_SUFFIX}`;

  return {
    betterAuthUrl: `https://${serverHost}`,
    composeProjectName: `${PROJECT_PREFIX}-${slug}`,
    cookieDomain: parentDomainOfWebAndServerHosts,
    corsOrigin: `https://${webHost}`,
    docsHost,
    docsUrl: `https://${docsHost}`,
    mailHost,
    mailUrl: `https://${mailHost}`,
    serverHost,
    slug,
    viteServerUrl: `https://${serverHost}`,
    webHost,
  };
};
