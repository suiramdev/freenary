-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "balanceAfterTransaction" INTEGER,
ADD COLUMN     "bankTransactionCode" TEXT,
ADD COLUMN     "bankTransactionSubCode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "creditorAccountIban" TEXT,
ADD COLUMN     "debtorAccountIban" TEXT,
ADD COLUMN     "exchangeRate" TEXT,
ADD COLUMN     "merchantCategoryCode" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'BOOK',
ADD COLUMN     "transactionDate" TIMESTAMP(3),
ADD COLUMN     "valueDate" TIMESTAMP(3);

-- Plain CREATE INDEX: Prisma Migrate wraps this file in one transaction, where
-- CONCURRENTLY cannot run — and any database reaching this migration has the
-- column created a few lines above, so the write lock cannot block real traffic.
-- CreateIndex
CREATE INDEX "transaction_accountId_merchantCategoryCode_idx" ON "transaction"("accountId", "merchantCategoryCode");
