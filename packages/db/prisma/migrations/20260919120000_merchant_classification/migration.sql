-- Categories a configured classifier answered, one row per merchant signature,
-- so a merchant is asked about once and reused across syncs and users.
CREATE TABLE "merchant_classification" (
  "signature" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "taxonomyVersion" INTEGER NOT NULL,
  "category" TEXT,
  "confidence" DOUBLE PRECISION,
  "answeredBy" TEXT,
  "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_classification_pkey" PRIMARY KEY ("signature")
);

-- Internal transfers used to borrow the `channel` stage name.
UPDATE "transaction" SET "resolutionStage" = 'internal-transfer' WHERE "isInternalTransfer" = true;
