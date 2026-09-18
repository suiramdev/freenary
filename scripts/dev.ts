import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Option } from "effect";

import { deriveDevIdentity } from "./dev-identity";

const DEV_COMPOSE_FILE = "docker-compose.dev.yml";
const WORKTREE_ENV_FILE = ".env";
const DETACHED_HEAD_REF = "HEAD";
const RESET_VERB = "reset";
const SPAWN_FAILURE_EXIT_CODE = 1;
const QUOTE_EDGES = /^["']|["']$/gu;

const readWorktreeEnvFile = Option.liftThrowable((file: string): string =>
  readFileSync(file, "utf-8")
);

const readBranch = (): string | null => {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
  });
  const ref = result.status === 0 ? result.stdout.trim() : "";
  const isDetachedHead = ref === DETACHED_HEAD_REF;

  return ref && !isDetachedHead ? ref : null;
};

const readEnvOverride = (key: string): string | null => {
  const shellOverrideWins = process.env[key]?.trim();

  if (shellOverrideWins) {
    return shellOverrideWins;
  }

  const assignment = new RegExp(`^\\s*${key}\\s*=\\s*(?<value>.+?)\\s*$`, "mu");

  return Option.getOrNull(
    readWorktreeEnvFile(WORKTREE_ENV_FILE).pipe(
      Option.flatMapNullishOr(
        (contents) => contents.match(assignment)?.groups?.value
      ),
      Option.map((value) => value.replace(QUOTE_EDGES, "")),
      Option.filter((value) => value.length > 0)
    )
  );
};

const compose = (args: string[], env: typeof process.env): number => {
  const result = spawnSync("docker", ["compose", ...args], {
    env,
    stdio: "inherit",
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  return result.status ?? SPAWN_FAILURE_EXIT_CODE;
};

const main = (): number => {
  const rest = process.argv.slice(2);
  const identity = deriveDevIdentity({
    branch: readBranch(),
    dir: path.basename(process.cwd()),
    slugOverride: readEnvOverride("FREENARY_SLUG"),
  });

  const env = {
    ...process.env,
    AUTH_COOKIE_DOMAIN:
      readEnvOverride("AUTH_COOKIE_DOMAIN") ?? identity.cookieDomain,
    DOCS_HOST: identity.docsHost,
    FREENARY_SLUG: identity.slug,
    SERVER_HOST: identity.serverHost,
    WEB_HOST: identity.webHost,
  };

  const base = ["-p", identity.composeProjectName, "-f", DEV_COMPOSE_FILE];

  process.stdout.write(
    `[freenary dev] worktree "${identity.slug}"\n  web     ${identity.corsOrigin}\n  server  ${identity.betterAuthUrl}\n  docs    ${identity.docsUrl}\n  project ${identity.composeProjectName}\n`
  );

  if (rest[0] === RESET_VERB) {
    const downWithVolumes = compose([...base, "down", "-v"], env);

    return downWithVolumes === 0
      ? compose([...base, "up", "--build", "--watch"], env)
      : downWithVolumes;
  }

  return compose([...base, ...rest], env);
};

process.exitCode = main();
