export const formatCurrency = (
  amountMinorUnits: number,
  currency = "EUR"
): string =>
  new Intl.NumberFormat(undefined, {
    currency,
    style: "currency",
  }).format(amountMinorUnits / 100);
