-- `gist_trgm_ops` below is provided by pg_trgm, which ships with the stock postgres
-- image. Prisma v7 has no schema-level extension block, so this is the documented path.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "merchant_normalisedName_trgm_idx" ON "merchant" USING GIST ("normalisedName" gist_trgm_ops);

-- CreateIndex
CREATE INDEX "merchant_alias_normalisedAlias_trgm_idx" ON "merchant_alias" USING GIST ("normalisedAlias" gist_trgm_ops);
