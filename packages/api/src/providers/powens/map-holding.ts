import type { ProviderHolding } from "../types";
import type { PowensInvestment } from "./client";
import { isReported, toMinorUnits } from "./client";

const vouchedCodeType = (
  codeType: string | null | undefined
): ProviderHolding["codeType"] =>
  codeType === "AMF" || codeType === "ISIN" ? codeType : undefined;

export const mapPowensInvestment = (
  investment: PowensInvestment,
  currency: string,
  precision: number
): ProviderHolding | null => {
  const {
    code_type: codeType,
    diff,
    quantity,
    unitprice,
    unitvalue,
    valuation,
  } = investment;

  if (investment.deleted || !(isReported(quantity) && isReported(valuation))) {
    return null;
  }

  return {
    code: investment.code ?? undefined,
    codeType: vouchedCodeType(codeType),
    currency,
    label: investment.label ?? "",
    providerHoldingId: String(investment.id),
    quantity: String(quantity),
    unitCost: isReported(unitprice) ? String(unitprice) : undefined,
    unitValue: isReported(unitvalue) ? String(unitvalue) : undefined,
    unrealisedGainMinor: isReported(diff)
      ? toMinorUnits(diff, precision)
      : undefined,
    valuationMinor: toMinorUnits(valuation, precision),
    valuedAt: investment.vdate ?? undefined,
  };
};

export const mapPowensInvestments = (
  investments: readonly PowensInvestment[],
  currency: string,
  precision: number
): ProviderHolding[] => {
  const holdings: ProviderHolding[] = [];

  for (const investment of investments) {
    const holding = mapPowensInvestment(investment, currency, precision);

    if (holding) {
      holdings.push(holding);
    }
  }

  return holdings;
};
