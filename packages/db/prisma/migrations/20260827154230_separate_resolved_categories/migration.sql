-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "categoryOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedCategory" TEXT;

-- Prisma cannot express PostgreSQL's NULLS NOT DISTINCT unique indexes.
-- Keep the newest global memo if an earlier development seed created duplicates.
DELETE FROM "descriptor_memo"
WHERE "id" IN (
    SELECT "id"
    FROM (
        SELECT "id",
               ROW_NUMBER() OVER (
                   PARTITION BY "normalisedDescriptor"
                   ORDER BY "updatedAt" DESC, "id" DESC
               ) AS duplicate_rank
        FROM "descriptor_memo"
        WHERE "userId" IS NULL
    ) AS ranked_global_memos
    WHERE duplicate_rank > 1
);

DROP INDEX "descriptor_memo_userId_normalisedDescriptor_key";
CREATE UNIQUE INDEX "descriptor_memo_userId_normalisedDescriptor_key"
ON "descriptor_memo"("userId", "normalisedDescriptor") NULLS NOT DISTINCT;
