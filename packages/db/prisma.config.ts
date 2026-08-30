import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  datasource: {
    // Not `env("DATABASE_URL")`: that aborts config load, so a checkout without
    // apps/server/.env cannot even `bun install` (postinstall runs `prisma
    // generate`, which needs no database). Undefined instead leaves the commands
    // that do connect — migrate, db push, studio — to ask for it themselves.
    url: process.env.DATABASE_URL || undefined,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  schema: path.join("prisma", "schema"),
});
