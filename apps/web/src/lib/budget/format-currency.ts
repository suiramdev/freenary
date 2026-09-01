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
