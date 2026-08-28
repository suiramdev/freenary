// Worktree-aware wrapper around `docker compose` for the dev stack. Derives
// this worktree's identity (see dev-identity.ts) and injects it: the project
// name via `-p` (the highest-precedence lever, so it holds regardless of the
// file's `name:`), and the slug + hostnames via the environment Compose
// interpolates. Several worktrees can then run at once without container-name,
// OrbStack-domain, or CORS collisions. All `dev:*` scripts route through here
// so every command targets the current worktree's stack.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { deriveDevIdentity } from "./dev-identity";

const DEV_COMPOSE_FILE = "compose.dev.yml";
const SLUG_ENV_LINE = /^\s*FREENARY_SLUG\s*=\s*(?<value>.+?)\s*$/mu;
const QUOTE_EDGES = /^["']|["']$/gu;

const readBranch = (): string | null => {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
  });
  const branch = result.status === 0 ? result.stdout.trim() : "";
  // Detached HEAD reports "HEAD"; treat it as no branch so we fall back to the dir.
  return branch && branch !== "HEAD" ? branch : null;
};

// FREENARY_SLUG may live in the worktree-local .env (copied per worktree). Read
// just that one key without a dotenv dependency; the shell env wins when both are set.
const readSlugOverride = (): string | null => {
  const fromShell = process.env.FREENARY_SLUG?.trim();
  if (fromShell) {
    return fromShell;
  }
  if (!existsSync(".env")) {
    return null;
  }
  const match = readFileSync(".env", "utf-8").match(SLUG_ENV_LINE);
  const value = match?.groups?.value?.replace(QUOTE_EDGES, "");
  return value || null;
};

const compose = (args: string[], env: typeof process.env): number => {
  const result = spawnSync("docker", ["compose", ...args], {
    env,
    stdio: "inherit",
  });
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }
  return result.status ?? 1;
};

const main = (): number => {
  const rest = process.argv.slice(2);
  const identity = deriveDevIdentity({
    branch: readBranch(),
    dir: path.basename(process.cwd()),
    slugOverride: readSlugOverride(),
  });

  const env = {
    ...process.env,
    DOCS_HOST: identity.docsHost,
    FREENARY_SLUG: identity.slug,
    SERVER_HOST: identity.serverHost,
    WEB_HOST: identity.webHost,
  };

  const base = ["-p", identity.composeProjectName, "-f", DEV_COMPOSE_FILE];

  process.stdout.write(
    `[freenary dev] worktree "${identity.slug}"\n  web     ${identity.corsOrigin}\n  server  ${identity.betterAuthUrl}\n  docs    ${identity.docsUrl}\n  project ${identity.composeProjectName}\n`
  );

  // `reset` is our own verb: down -v (this worktree's volumes only), then rebuild up.
  if (rest[0] === "reset") {
    const down = compose([...base, "down", "-v"], env);
    return down === 0
      ? compose([...base, "up", "--build", "--watch"], env)
      : down;
  }

  return compose([...base, ...rest], env);
};

process.exitCode = main();
