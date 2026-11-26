import { spawnSync } from "node:child_process";
import path from "node:path";

import { Generator, getConfig } from "@tanstack/router-generator";

const APP_DIR = path.join(import.meta.dirname, "..");

const PARAGLIDE_ARGS = [
  "compile",
  "--project",
  "./project.inlang",
  "--outdir",
  "./src/paraglide",
  "--output-structure",
  "message-modules",
  "--strategy",
  "cookie",
  "preferredLanguage",
  "baseLocale",
  "--emit-ts-declarations",
];

const paraglide = spawnSync("bun", ["x", "paraglide-js", ...PARAGLIDE_ARGS], {
  cwd: APP_DIR,
  stdio: "inherit",
});

if (paraglide.status !== 0) {
  process.exit(paraglide.status ?? 1);
}

const config = await getConfig({ routesDirectory: "app/routes" });
const generator = new Generator({ config, root: APP_DIR });
await generator.run();
