-- AlterTable
ALTER TABLE "bank_connection" ADD COLUMN     "institutionId" TEXT;

-- Backfill: Enable Banking identifies an institution by its own name
-- (listInstitutions maps `id: aspsp.name`), so the stored institutionName is
-- the institution id for every connection created before this column existed.
UPDATE "bank_connection"
SET "institutionId" = "institutionName"
WHERE "institutionId" IS NULL AND "provider" = 'enable-banking';
