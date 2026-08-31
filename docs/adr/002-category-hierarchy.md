# ADR-002: Two-Level Category Hierarchy

## Status

Accepted

## Context

Categorisation, budgeting and the cash-flow Sankey each needed a category vocabulary, and all three used the same flat set of seventeen values (`dining`, `housing`, `utilities`, …). That flat set failed all three at once:

- **Too coarse to be useful.** `housing` absorbed rent, the mortgage, co-ownership charges, buildings insurance and the plumber, and `dining` absorbed restaurants, bars and fast food alike. A budget that cannot separate rent from the mortgage cannot answer "where is my money going?".
- **No level to group by.** The Sankey wants a readable middle column. With a flat set the only column available was the seventeen categories themselves, so the chart had three levels of nodes but only one level of meaning.
- **Budgeting and categorisation drifted.** A budget line's category and a transaction's category were the same enum by accident, not by design, and custom categories nested under a predefined category — a second level that existed for budgeting and nowhere else.

The reference point for the target shape is Finary's budget Sankey: revenues, then main groups, then the detailed categories inside each group.

## Decision

### 1. One hierarchy, exactly two levels

`packages/api/src/lib/taxonomy.ts` is the single source of truth: 16 **category groups**, holding 75 **spending categories**. Nothing nests deeper. Categorisation resolves a transaction to a category, budgeting assigns a category to a line, and the Sankey renders groups and categories as its two meaningful levels.

Income is part of the same vocabulary rather than a parallel one, because a cash flow only balances if money in and money out are spelled the same way.

### 2. A signal maps to the most precise category it supports, never further

Every group carries a catch-all category (`other-housing`, `other-transport`, …). A signal that identifies only the group lands there. A NAF _division_ (`85 = education`) resolves to `other-education`; a NAF _class_ (`47.73 = pharmacies`) resolves to `pharmacy`. Inventing `tuition` from a division would manufacture precision the data does not carry.

The same rule keeps signals consistent with each other: a merchant must not change category depending on whether it was matched by MCC, OSM tag or NAF code. Car rental is `other-travel` in all three; books are `hobbies` in all three.

### 3. Groups own colour and icon; a category inherits its group's

75 hand-picked icons is not maintainable, and 75 glyphs on one screen is noise rather than information. `categoryColor()` and `categoryIcon()` resolve through `CATEGORY_GROUP_OF`. Custom categories keep their own colour and icon, since the user chose them deliberately.

### 4. A group is a heading, not an assignable value

`parseCategoryKey` rejects a predefined group slug, so a budget line always references a category or a custom category. A **custom** top-level category is the exception: it is a group of the user's own and stays assignable, because it holds no categories to pick instead.

`CustomCategory.parentSlug` now names a group, not a category.

### 5. The Sankey is three columns, one per level

Columns are: income sources → group → category. No hub node sits between them, so the chart's columns are exactly the product's levels.

Money is fungible, so nothing makes one income source the true funder of one group. Rather than link every source to every group — N×M ribbons for the same totals, which reads as a wash — `apportion` fills each group in turn from the sources in order, needing at most N+M-1. When income falls short the trailing groups get no inbound ribbon, which is what an overspent period looks like.

Unspent income is a group node with no categories under it, labelled **Money left** in both the cash-flow and budget-profile charts.

### 6. A group's aggregate is the sum of its categories, including under median

Under `average`/`median` aggregation the group value is the sum of its per-category values, not a median computed over the group. A median of medians does not add up, and every ribbon leaving a group node must sum to the node itself or the chart lies. This matches the convention `totalExpenses` already used.

### 7. Legacy slugs are decoded, not rejected

`LEGACY_CATEGORY_SLUGS` maps each of the seventeen old values to its group's catch-all; only `groceries` and `savings` had a one-to-one successor. Migration `20260831120000_category_hierarchy` rewrites stored slugs in `transaction.category`, `transaction.resolvedCategory`, `merchant_override.category`, `budget_line.categorySlug` and `custom_category.parentSlug`.

`resolveCategorySlug` additionally decodes legacy spellings at read time, which is what lets a merchant-dictionary artifact or a trained model file built before the hierarchy keep working instead of being skipped entry by entry.

## Consequences

- The 75-value set is too long for a flat picker, so pickers and the settings list group and collapse, and the budget-line picker gained a search field. That is a requirement of the design, not polish.
- The spending-breakdown pie renders **groups**; 75 slices would carry less information than 16. Per-category detail lives in the Sankey.
- The transaction filter accepts groups as well as categories, so clicking a group node filters on the group rather than expanding into nine category chips.
- Adding a category means one entry in `SPENDING_CATEGORIES`, one in `CATEGORY_GROUP_OF`, one in `CATEGORY_LABELS`. No colour, no icon, no migration.
- Adding a _group_ additionally needs a colour, an icon and a catch-all category; `taxonomy.test.ts` fails until all three exist.
- `taxonomy.test.ts` parses the migration SQL and asserts it agrees with the TypeScript tables. Without that, the database and the code could disagree silently — the one failure mode in this change that no type checks.
- The merchant dictionary must be rebuilt for the new categories. Until it is, `dictionary.ts` decodes its legacy values, so categorisation degrades in precision rather than breaking.
