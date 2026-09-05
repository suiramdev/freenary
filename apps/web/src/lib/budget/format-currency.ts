import { getLocale } from "@/paraglide/runtime.js";

// Charts hand this straight to `formatValue`/`valueFormatter` as a bare
// function reference, so the locale is read here rather than threaded through.
export const formatCurrency = (
  amountMinorUnits: number,
  currency = "EUR"
): string =>
  new Intl.NumberFormat(getLocale(), {
    currency,
    style: "currency",
  }).format(amountMinorUnits / 100);

/**
 * The assistant's charts carry decimal amounts, as its tools return them.
 * Formatting the decimal directly keeps a third decimal for currencies that
 * have one; a round trip through minor units would round it away.
 */
export const formatDecimalCurrency = (
  amount: number,
  currency = "EUR"
): string =>
  new Intl.NumberFormat(getLocale(), {
    currency,
    style: "currency",
  }).format(amount);
