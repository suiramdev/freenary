import { readFileSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

/**
 * Resolve DATABASE_URL from DATABASE_URL_FILE (the Docker secrets
 * convention) before Prisma reads it, so the migrate service can run
 * without a plain DATABASE_URL in the environment. Setting both is an
 * error, and an unreadable file fails the migration at startup with a
 * clear message instead of a cryptic connection error.
 */
const resolveDatabaseUrl = (): string | undefined => {
  const filePath = process.env.DATABASE_URL_FILE;
  if (!filePath) {
    return process.env.DATABASE_URL || undefined;
  }
  if (process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL and DATABASE_URL_FILE are both set; set only one"
    );
  }
  try {
    return readFileSync(filePath, "utf8").replace(/[\r\n]+$/u, "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot read DATABASE_URL from DATABASE_URL_FILE (${filePath}): ${detail}`
    );
  }
};

const databaseUrlIfConfigured = resolveDatabaseUrl();

export default defineConfig({
  datasource: {
    url: databaseUrlIfConfigured,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  schema: path.join("prisma", "schema"),
});
