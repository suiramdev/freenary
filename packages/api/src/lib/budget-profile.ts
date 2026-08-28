/**
 * Bounds for a budget line's planned amount, shared by the router that validates
 * a save and the editor that blocks one. `BudgetLine.amount` is a Postgres
 * INTEGER, so anything larger fails at insert time rather than validation time.
 */
export const MAX_AMOUNT_MINOR_UNITS = 2_147_483_647;

export const MAX_BUDGET_LINE_LABEL_LENGTH = 60;

export const MAX_BUDGET_LINES = 200;
