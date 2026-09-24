-- Instance configuration an operator supplies through the setup screen instead
-- of the .env file. Values are sealed before they reach this table; the server
-- never stores a credential it could read back without BETTER_AUTH_SECRET.
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'OPERATOR');

ALTER TABLE "user" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'MEMBER';

CREATE TABLE "instance_setting" (
  "key" TEXT NOT NULL,
  "sealed" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,

  CONSTRAINT "instance_setting_pkey" PRIMARY KEY ("key")
);

-- One row for the whole setup lifecycle: the hash of the printed token while
-- the instance is unclaimed, the moment an operator claimed it, and the moment
-- the operator finished the wizard.
CREATE TABLE "instance_setup" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "tokenHash" TEXT,
  "claimedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "instance_setup_pkey" PRIMARY KEY ("id")
);
