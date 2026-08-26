import { env } from "@freenary/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

export type { Prisma } from "../prisma/generated/client";

export const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
};

const prisma = createPrismaClient();
export default prisma;
