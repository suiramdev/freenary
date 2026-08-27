-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "balanceAfterTransaction" INTEGER,
ADD COLUMN     "bankTransactionCode" TEXT,
ADD COLUMN     "bankTransactionFamilyCode" TEXT,
ADD COLUMN     "bankTransactionSubCode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "creditorAccountIban" TEXT,
ADD COLUMN     "creditorAgentBic" TEXT,
ADD COLUMN     "creditorCountry" TEXT,
ADD COLUMN     "creditorIdentifications" JSONB,
ADD COLUMN     "creditorTown" TEXT,
ADD COLUMN     "debtorAccountIban" TEXT,
ADD COLUMN     "exchangeRate" TEXT,
ADD COLUMN     "intermediaryId" TEXT,
ADD COLUMN     "merchantCategoryCode" TEXT,
ADD COLUMN     "merchantId" TEXT,
ADD COLUMN     "normalisedDescriptor" TEXT,
ADD COLUMN     "psuNote" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "referenceNumberScheme" TEXT,
ADD COLUMN     "remittanceLines" TEXT[],
ADD COLUMN     "resolutionConfidence" DOUBLE PRECISION,
ADD COLUMN     "resolutionStage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'BOOK',
ADD COLUMN     "transactionDate" TIMESTAMP(3),
ADD COLUMN     "valueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalisedName" TEXT NOT NULL,
    "category" TEXT,
    "domains" TEXT[],
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_alias" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalisedAlias" TEXT NOT NULL,

    CONSTRAINT "merchant_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermediary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ibans" TEXT[],

    CONSTRAINT "intermediary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descriptor_memo" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "normalisedDescriptor" TEXT NOT NULL,
    "merchantId" TEXT,
    "intermediaryId" TEXT,
    "category" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "descriptor_memo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_normalisedName_idx" ON "merchant"("normalisedName");

-- CreateIndex
CREATE INDEX "merchant_alias_normalisedAlias_idx" ON "merchant_alias"("normalisedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_alias_merchantId_normalisedAlias_key" ON "merchant_alias"("merchantId", "normalisedAlias");

-- CreateIndex
CREATE INDEX "descriptor_memo_normalisedDescriptor_idx" ON "descriptor_memo"("normalisedDescriptor");

-- CreateIndex
CREATE UNIQUE INDEX "descriptor_memo_userId_normalisedDescriptor_key" ON "descriptor_memo"("userId", "normalisedDescriptor");

-- CreateIndex
CREATE INDEX "transaction_accountId_merchantCategoryCode_idx" ON "transaction"("accountId", "merchantCategoryCode");

-- CreateIndex
CREATE INDEX "transaction_normalisedDescriptor_idx" ON "transaction"("normalisedDescriptor");

-- CreateIndex
CREATE INDEX "transaction_merchantId_idx" ON "transaction"("merchantId");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "intermediary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_alias" ADD CONSTRAINT "merchant_alias_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descriptor_memo" ADD CONSTRAINT "descriptor_memo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descriptor_memo" ADD CONSTRAINT "descriptor_memo_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descriptor_memo" ADD CONSTRAINT "descriptor_memo_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "intermediary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
