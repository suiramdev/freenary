-- Convert stored category slugs from the flat set to the two-level hierarchy.
-- A broad old slug becomes its group's "other-*" category: it never carried
-- more precision than the group, so anything narrower would be invented.
-- Mirrors LEGACY_CATEGORY_SLUGS in packages/api/src/lib/taxonomy.ts.

-- The two legs of a movement between the user's own accounts have a category of
-- their own now, so claim them before the generic map sends them to other-transfer.
UPDATE "transaction"
SET "category" = 'internal-transfer'
WHERE "isInternalTransfer" = true AND "category" = 'transfers';

UPDATE "transaction"
SET "resolvedCategory" = 'internal-transfer'
WHERE "isInternalTransfer" = true AND "resolvedCategory" = 'transfers';

-- The atm and fee channel short-circuits retargeted too: both used to share a
-- broad slug and now have a category of their own. Without this, a historical
-- withdrawal and one imported tomorrow sit under different Sankey nodes.
UPDATE "transaction"
SET "resolvedCategory" = 'cash-withdrawal'
WHERE "channel" = 'atm'
  AND "resolutionStage" = 'channel'
  AND "resolvedCategory" = 'transfers';

UPDATE "transaction"
SET "resolvedCategory" = 'bank-fees'
WHERE "channel" = 'fee'
  AND "resolutionStage" = 'channel'
  AND "resolvedCategory" = 'other';

CREATE TEMPORARY TABLE "category_slug_migration" (
  "legacy" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL,
  "group" TEXT NOT NULL
);

INSERT INTO "category_slug_migration" ("legacy", "category", "group") VALUES
  ('dining', 'other-daily-living', 'daily-living'),
  ('education', 'other-education', 'education'),
  ('entertainment', 'other-leisure', 'leisure'),
  ('groceries', 'groceries', 'daily-living'),
  ('health', 'other-health', 'health'),
  ('housing', 'other-housing', 'housing'),
  ('income', 'other-income', 'income'),
  ('insurance', 'other-insurance', 'financial'),
  ('other', 'uncategorised', 'other'),
  ('savings', 'savings', 'investments'),
  ('shopping', 'other-shopping', 'shopping'),
  ('subscriptions', 'other-subscription', 'subscriptions'),
  ('taxes', 'other-taxes', 'taxes'),
  ('transfers', 'other-transfer', 'transfers'),
  ('transport', 'other-transport', 'transport'),
  ('travel', 'other-travel', 'travel'),
  ('utilities', 'other-utilities', 'utilities');

UPDATE "transaction" AS t
SET "category" = m."category"
FROM "category_slug_migration" AS m
WHERE t."category" = m."legacy";

UPDATE "transaction" AS t
SET "resolvedCategory" = m."category"
FROM "category_slug_migration" AS m
WHERE t."resolvedCategory" = m."legacy";

UPDATE "merchant_override" AS o
SET "category" = m."category"
FROM "category_slug_migration" AS m
WHERE o."category" = m."legacy";

UPDATE "budget_line" AS l
SET "categorySlug" = m."category"
FROM "category_slug_migration" AS m
WHERE l."categorySlug" = m."legacy";

-- A custom category nests under a group now, not under another category.
UPDATE "custom_category" AS c
SET "parentSlug" = m."group"
FROM "category_slug_migration" AS m
WHERE c."parentSlug" = m."legacy";

-- dining and groceries both collapse into daily-living, so two rows can end up
-- sharing a sortOrder. moveCustomCategory swaps with a strictly lesser/greater
-- neighbour, so a tie is permanently unorderable — renumber per parent.
WITH "ordered" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "parentSlug" ORDER BY "sortOrder", "label"
    ) - 1 AS "rank"
  FROM "custom_category"
)
UPDATE "custom_category" AS c
SET "sortOrder" = o."rank"
FROM "ordered" AS o
WHERE c."id" = o."id";

DROP TABLE "category_slug_migration";
