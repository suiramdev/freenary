-- Enable pg_trgm for trigram similarity indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "country" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "institutionCountry" TEXT,
    "institutionBic" TEXT,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "iban" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "counterpartyName" TEXT,
    "merchantCategoryCode" TEXT,
    "bankTransactionCode" TEXT,
    "bankTransactionSubCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BOOK',
    "valueDate" TIMESTAMP(3),
    "transactionDate" TIMESTAMP(3),
    "balanceAfterTransaction" INTEGER,
    "creditorAccountIban" TEXT,
    "debtorAccountIban" TEXT,
    "referenceNumber" TEXT,
    "exchangeRate" TEXT,
    "category" TEXT,
    "categoryOverride" BOOLEAN NOT NULL DEFAULT false,
    "resolvedCategory" TEXT,
    "normalisedDescriptor" TEXT,
    "remittanceLines" TEXT[],
    "bankTransactionFamilyCode" TEXT,
    "creditorAgentBic" TEXT,
    "creditorTown" TEXT,
    "creditorCountry" TEXT,
    "creditorIdentifications" JSONB,
    "referenceNumberScheme" TEXT,
    "psuNote" TEXT,
    "merchantId" TEXT,
    "intermediaryId" TEXT,
    "resolutionStage" TEXT,
    "resolutionConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account"("issuer", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "bank_connection_userId_idx" ON "bank_connection"("userId");

-- CreateIndex
CREATE INDEX "bank_account_connectionId_idx" ON "bank_account"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_connectionId_providerAccountId_key" ON "bank_account"("connectionId", "providerAccountId");

-- CreateIndex
CREATE INDEX "transaction_accountId_date_idx" ON "transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "transaction_accountId_amount_idx" ON "transaction"("accountId", "amount");

-- CreateIndex
CREATE INDEX "transaction_accountId_merchantCategoryCode_idx" ON "transaction"("accountId", "merchantCategoryCode");

-- CreateIndex
CREATE INDEX "transaction_normalisedDescriptor_idx" ON "transaction"("normalisedDescriptor");

-- CreateIndex
CREATE INDEX "transaction_merchantId_idx" ON "transaction"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_accountId_providerTransactionId_key" ON "transaction"("accountId", "providerTransactionId");

-- CreateIndex
CREATE INDEX "merchant_normalisedName_idx" ON "merchant"("normalisedName");

-- CreateIndex
CREATE INDEX "merchant_normalisedName_trgm_idx" ON "merchant" USING GIST ("normalisedName" gist_trgm_ops);

-- CreateIndex
CREATE INDEX "merchant_alias_normalisedAlias_idx" ON "merchant_alias"("normalisedAlias");

-- CreateIndex
CREATE INDEX "merchant_alias_normalisedAlias_trgm_idx" ON "merchant_alias" USING GIST ("normalisedAlias" gist_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_alias_merchantId_normalisedAlias_key" ON "merchant_alias"("merchantId", "normalisedAlias");

-- CreateIndex
CREATE INDEX "descriptor_memo_normalisedDescriptor_idx" ON "descriptor_memo"("normalisedDescriptor");

-- CreateIndex
CREATE INDEX "descriptor_memo_normalisedDescriptor_trgm_idx" ON "descriptor_memo" USING GIST ("normalisedDescriptor" gist_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "descriptor_memo_userId_normalisedDescriptor_key" ON "descriptor_memo"("userId", "normalisedDescriptor") NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connection" ADD CONSTRAINT "bank_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
