import { getLocale } from "@/paraglide/runtime.js";

const MINOR_PER_UNIT = 100;
const DEFAULT_CURRENCY = "EUR";
const SYMBOL_PROBE_AMOUNT = 0;

export const formatCurrency = (
  amountMinorUnits: number,
  currency = DEFAULT_CURRENCY
): string =>
  new Intl.NumberFormat(getLocale(), {
    currency,
    style: "currency",
  }).format(amountMinorUnits / MINOR_PER_UNIT);

export const currencySymbol = (currency = DEFAULT_CURRENCY): string =>
  new Intl.NumberFormat(getLocale(), { currency, style: "currency" })
    .formatToParts(SYMBOL_PROBE_AMOUNT)
    .find((part) => part.type === "currency")?.value ?? currency;

export const formatDecimalCurrency = (
  amount: number,
  currency = DEFAULT_CURRENCY
): string =>
  new Intl.NumberFormat(getLocale(), {
    currency,
    style: "currency",
  }).format(amount);
