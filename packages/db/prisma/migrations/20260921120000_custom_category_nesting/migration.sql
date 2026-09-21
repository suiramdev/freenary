-- A user's own top-level category may hold subcategories, and nesting stops
-- there. The pair ("parentSlug", "parentId") is mutually exclusive and the API
-- derives exactly one of them from a single input field, so no CHECK constraint
-- restates it here.
ALTER TABLE "custom_category" ADD COLUMN "parentId" TEXT;

ALTER TABLE "custom_category" ADD CONSTRAINT "custom_category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "custom_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "custom_category_userId_parentId_sortOrder_idx"
  ON "custom_category" ("userId", "parentId", "sortOrder");
