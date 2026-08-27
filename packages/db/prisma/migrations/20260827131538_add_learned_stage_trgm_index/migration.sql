-- CreateIndex
CREATE INDEX "descriptor_memo_normalisedDescriptor_trgm_idx" ON "descriptor_memo" USING GIST ("normalisedDescriptor" gist_trgm_ops);
