-- A budget line's place in the revenues → investments → outgoings flow is now
-- derived from the group its category sits in, so the stored copy is dropped
-- rather than left to drift when a custom category is re-parented.
DROP INDEX "budget_line_userId_kind_sortOrder_idx";

ALTER TABLE "budget_line" DROP COLUMN "kind";

DROP TYPE "BudgetLineKind";

-- sortOrder was already unique per user across the three kinds, so the profile
-- keeps the order it was saved in.
CREATE INDEX "budget_line_userId_sortOrder_idx" ON "budget_line"("userId", "sortOrder");

-- A line with no name of its own now shows its category's name instead.
ALTER TABLE "budget_line" ALTER COLUMN "label" DROP NOT NULL;
