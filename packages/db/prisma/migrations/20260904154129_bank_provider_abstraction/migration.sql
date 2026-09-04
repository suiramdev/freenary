-- Powens reports an account kind, a balance and a currency; Enable Banking
-- reports none of them, so every existing row reads UNKNOWN with null balances
-- and nothing is back-filled.
-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CARD', 'LOAN', 'BROKERAGE', 'LIFE_INSURANCE', 'RETIREMENT', 'EMPLOYEE_SAVINGS', 'REAL_ESTATE', 'CROWDLENDING', 'UNKNOWN');

-- AlterTable
ALTER TABLE "bank_account" ADD COLUMN     "balanceAt" TIMESTAMP(3),
ADD COLUMN     "balanceMinor" INTEGER,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "type" "BankAccountType" NOT NULL DEFAULT 'UNKNOWN';

-- Powens scopes all data under a per-user identity created at the provider;
-- the core stores it so an adapter never touches the database.
-- CreateTable
CREATE TABLE "bank_provider_user" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_provider_user_pkey" PRIMARY KEY ("id")
);

-- Each sync replaces an account's holdings, so this table is a snapshot rather
-- than a history: quantities stay decimal, values stay integer minor units.
-- CreateTable
CREATE TABLE "holding" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerHoldingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "code" TEXT,
    "codeType" TEXT,
    "quantity" DECIMAL(24,8) NOT NULL,
    "unitCost" DECIMAL(24,6),
    "unitValue" DECIMAL(24,6),
    "valuationMinor" INTEGER NOT NULL,
    "unrealisedGainMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "valuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_provider_user_userId_provider_key" ON "bank_provider_user"("userId", "provider");

-- CreateIndex
CREATE INDEX "holding_accountId_idx" ON "holding"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "holding_accountId_providerHoldingId_key" ON "holding"("accountId", "providerHoldingId");

-- AddForeignKey
ALTER TABLE "bank_provider_user" ADD CONSTRAINT "bank_provider_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding" ADD CONSTRAINT "holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
