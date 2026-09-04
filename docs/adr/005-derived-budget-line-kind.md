# ADR-005: A Budget Line's Kind Is Derived From Its Category

## Status

Accepted. Completes the consolidation [ADR-002](002-category-hierarchy.md) started: the category hierarchy is now the only vocabulary a budget line declares.

## Context

`BudgetLine` carried a `kind` enum — `REVENUE`, `INVESTMENT`, `OUTGOING` — alongside its category. The settings form asked for both: three ordered sections, one per kind, each with its own add button and its own default category.

The two fields are not independent. ADR-002 made income part of the same taxonomy as spending, so a category already names which side of the flow its line sits on: a category in the **Income** group is money coming in, one in **Investments** is money set aside, anything else is an outgoing. Asking the user for the kind and then the category asked the same question twice, and let them disagree:

- Picking `salary` inside the **Outgoings** section stored an outgoing that the cash-flow chart drew as spending on income.
- `updateCustomCategory` re-parents a custom category between groups without touching the lines that reference it, so moving a savings pot from **Investments** to **Leisure** left every line on it stored as an investment forever.

Nothing read `kind` that could not read the category instead: `getBudgetVsActual` filtered `kind: "OUTGOING"` and then resolved each line's group anyway, and the profile Sankey split revenues from allocations to lay out its columns.

## Decision

### 1. The category is the only declaration; the kind is a pure function of its group

`budgetLineKindOfGroup` in `packages/api/src/lib/budget-profile.ts` maps a category group to a kind, exhaustively over `CategoryGroup` so a new group has to state its side rather than defaulting to an outgoing. `budgetLineKindOf` composes it with `groupOfCategoryRef`, the group resolution `plannedByGroup` already used, and is what `getBudgetVsActual` filters on. The web preview calls `budgetLineKindOfGroup` on the group it resolves for the chart's middle column.

A custom category that is a group of its own names no taxonomy group; an allocation is the only reading left for it, so it derives as an outgoing.

### 2. `BudgetLine.kind` is dropped, not denormalised

Keeping the column as a cache of the derivation would keep the drift. The enum type goes with it, and the `[userId, kind, sortOrder]` index becomes `[userId, sortOrder]`: `sortOrder` was already unique per user across the three kinds, so existing profiles read back in the order they were saved.

`getBudgetProfile` therefore returns lines in one flat list, and the settings form renders one — the three sections existed only to collect the field that no longer exists.

### 3. A line's name is optional and falls back to its category's

With the kind gone, most lines repeat their category in their name, and the old form auto-filled the name from the category to spare the typing. `label` is now nullable: empty means "call it after its category", and the fallback resolves at display time, not at save time.

That timing is the point. Category names are message keys, so a line named `Salary` at save time would show English to a French reader forever. A null label renders through `categoryEntryLabel` in the reader's own locale.

## Consequences

- One derivation, three readers: `getBudgetVsActual`, the profile Sankey, and the settings preview. A line can no longer contradict its own category.
- Re-parenting a custom category between groups now moves its lines across the flow, which is what the user asked for by re-parenting it.
- The settings form asks three things per line — amount, category, and optionally a name — instead of four across three sections.
- Ordering is the list's, so the profile no longer reads revenues-first for a user whose stored `sortOrder` says otherwise. That makes order the user's to set, which the three sections never allowed: a line is dragged by a grip handle (`Reorder.Group`/`Reorder.Item` from `motion`, `dragListener={false}` so only the handle drags) or moved with the arrow keys while that handle has focus. A reorder alone is one unsaved change, because `sortOrder` is written from the list's order.
- A profile saved before this change keeps its labels. Nothing back-fills a name that matches its category to null, so existing lines look exactly as they did.
