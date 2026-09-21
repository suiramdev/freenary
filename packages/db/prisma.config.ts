import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

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
