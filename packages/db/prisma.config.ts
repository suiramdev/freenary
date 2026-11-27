import { resolveFileSecrets } from "@freenary/env/file-secrets";
import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

// Resolve DATABASE_URL from DATABASE_URL_FILE (the Docker secrets
// convention) before Prisma reads it, so the migrate service can run
// without a plain DATABASE_URL in the environment. Setting both is an
// error, and an unreadable file fails the migration at startup.
resolveFileSecrets(["DATABASE_URL"]);

const databaseUrlIfConfigured = process.env.DATABASE_URL || undefined;

export default defineConfig({
  datasource: {
    url: databaseUrlIfConfigured,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  schema: path.join("prisma", "schema"),
});
