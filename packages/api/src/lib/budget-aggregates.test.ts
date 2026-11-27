import { describe, expect, it } from "bun:test";

import { cashFlowAccountsOf } from "./account-types";
import {
  cashFlowPeriodsOf,
  countedTransactionsWhere,
  outgoingByCategory,
  sankeyOf,
  statRowOf,
} from "./budget-aggregates";
import { countedInFiguresWhere } from "./counted-transactions";

const MAY_FIFTH = new Date("2026-05-05T10:00:00.000Z");

const storedRow = (
  overrides: Partial<Parameters<typeof statRowOf>[0]>
): Parameters<typeof statRowOf>[0] => ({
  amount: -10_000,
  category: null,
  counterpartyName: "Wise",
  currency: "EUR",
  date: MAY_FIFTH,
  exchangeFeeMinor: null,
  isInternalTransfer: false,
  merchantKey: "wise",
  originalAmount: null,
  originalCurrency: null,
  resolvedCategory: "shopping",
  ...overrides,
});

describe("countedTransactionsWhere", () => {
  it("keeps every currency of the cash-flow accounts in the period, counted in figures", () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-10-31T23:59:59.999Z");

    expect(countedTransactionsWhere("user", from, to)).toEqual({
      AND: [countedInFiguresWhere],
      account: cashFlowAccountsOf("user"),
      date: { gte: from, lte: to },
    });
  });
});

describe("statRowOf", () => {
  it("leaves an ordinary transaction untouched", () => {
    const row = storedRow({});

    expect(statRowOf(row)).toEqual(row);
  });

  it("keeps a transfer into savings whole", () => {
    const row = storedRow({
      exchangeFeeMinor: 120,
      isInternalTransfer: true,
      resolvedCategory: "savings",
    });

    expect(statRowOf(row)).toEqual(row);
  });

  it("turns an exchange between currencies into the fee it cost", () => {
    expect(
      statRowOf(
        storedRow({
          amount: -100_000,
          currency: "EUR",
          exchangeFeeMinor: 350,
          isInternalTransfer: true,
          originalAmount: 108_000,
          originalCurrency: "USD",
          resolvedCategory: "internal-transfer",
        })
      )
    ).toEqual({
      amount: -350,
      category: "loans-bank-fees",
      counterpartyName: null,
      currency: "EUR",
      date: MAY_FIFTH,
      exchangeFeeMinor: 350,
      isInternalTransfer: true,
      merchantKey: null,
      originalAmount: null,
      originalCurrency: null,
      resolvedCategory: "loans-bank-fees",
    });
  });
});

describe("cashFlowPeriodsOf", () => {
  const rows = [
    { amount: -2000, date: new Date("2026-05-06T09:00:00.000Z") },
    { amount: 50_000, date: new Date("2026-05-04T09:00:00.000Z") },
    { amount: -3000, date: new Date("2026-05-04T18:00:00.000Z") },
    { amount: -1000, date: new Date("2026-05-11T09:00:00.000Z") },
  ];

  it("splits each day into incoming and outgoing, oldest first", () => {
    expect(cashFlowPeriodsOf(rows, "day")).toEqual([
      { incoming: 50_000, label: "2026-05-04", outgoing: 3000 },
      { incoming: 0, label: "2026-05-06", outgoing: 2000 },
      { incoming: 0, label: "2026-05-11", outgoing: 1000 },
    ]);
  });

  it("labels each week by its Monday", () => {
    expect(cashFlowPeriodsOf(rows, "week")).toEqual([
      { incoming: 50_000, label: "2026-05-04", outgoing: 5000 },
      { incoming: 0, label: "2026-05-11", outgoing: 1000 },
    ]);
  });

  it("files a Sunday under the Monday before it", () => {
    expect(
      cashFlowPeriodsOf(
        [{ amount: -500, date: new Date("2026-05-10T23:00:00.000Z") }],
        "week"
      )
    ).toEqual([{ incoming: 0, label: "2026-05-04", outgoing: 500 }]);
  });
});

describe("sankeyOf", () => {
  it("averages the expenses over a month that only has income too", () => {
    const sankey = sankeyOf(
      [
        {
          amount: 300_000,
          category: null,
          counterpartyName: "Employer",
          date: new Date("2026-01-10T00:00:00.000Z"),
          merchantKey: null,
          resolvedCategory: null,
        },
        {
          amount: -10_000,
          category: "groceries",
          counterpartyName: "Shop",
          date: new Date("2026-02-10T00:00:00.000Z"),
          merchantKey: null,
          resolvedCategory: null,
        },
      ],
      {
        aggregation: "average",
        from: new Date("2026-01-01T00:00:00.000Z"),
        rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
        to: new Date("2026-03-31T23:59:59.999Z"),
      }
    );

    expect(sankey.incomeNodes).toEqual([{ name: "Employer", value: 150_000 }]);
    expect(sankey.totalExpenses).toBe(5000);
    expect(sankey.moneyLeft).toBe(145_000);
  });
});

describe("outgoingByCategory", () => {
  const outgoing = (
    amount: number,
    category: string | null,
    date: string,
    resolvedCategory: string | null = category,
  ) => ({
    amount,
    category,
    date: new Date(date),
    merchantKey: null,
    resolvedCategory,
  });

  it("totals absolute amounts by category", () => {
    const rows = [
      outgoing(-10_000, "groceries", "2026-01-10T00:00:00.000Z"),
      outgoing(-5_000, "groceries", "2026-01-20T00:00:00.000Z"),
      outgoing(-2_000, null, "2026-02-05T00:00:00.000Z"),
    ];
    const result = outgoingByCategory(rows, {
      aggregation: "total",
      from: new Date("2026-01-01T00:00:00.000Z"),
      rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
      to: new Date("2026-02-28T00:00:00.000Z"),
    });
    expect(result.get("groceries")).toBe(15_000);
    expect(result.get("uncategorised")).toBe(2_000);
  });

  it("averages over active months, counting a category's empty months as zero", () => {
    const rows = [
      outgoing(-9_000, null, "2026-01-05T00:00:00.000Z"),
      outgoing(-12_000, "groceries", "2026-02-10T00:00:00.000Z"),
      outgoing(-6_000, "groceries", "2026-03-15T00:00:00.000Z"),
    ];
    const result = outgoingByCategory(rows, {
      aggregation: "average",
      from: new Date("2026-01-01T00:00:00.000Z"),
      rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
      to: new Date("2026-03-31T00:00:00.000Z"),
    });
    expect(result.get("groceries")).toBe(6_000);
    expect(result.get("uncategorised")).toBe(3_000);
  });

  it("takes the median of the zero-filled monthly series", () => {
    const rows = [
      outgoing(-9_000, null, "2026-01-05T00:00:00.000Z"),
      outgoing(-12_000, "groceries", "2026-02-10T00:00:00.000Z"),
      outgoing(-6_000, "groceries", "2026-03-15T00:00:00.000Z"),
    ];
    const result = outgoingByCategory(rows, {
      aggregation: "median",
      from: new Date("2026-01-01T00:00:00.000Z"),
      rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
      to: new Date("2026-03-31T00:00:00.000Z"),
    });
    expect(result.get("groceries")).toBe(6_000);
    expect(result.get("uncategorised")).toBe(0);
  });

  it("rounds the median of an even-length zero-filled series", () => {
    const rows = [
      outgoing(-1_000, null, "2026-01-05T00:00:00.000Z"),
      outgoing(-10_000, "groceries", "2026-02-10T00:00:00.000Z"),
      outgoing(-20_000, "groceries", "2026-03-15T00:00:00.000Z"),
      outgoing(-1_000, null, "2026-04-05T00:00:00.000Z"),
    ];
    const result = outgoingByCategory(rows, {
      aggregation: "median",
      from: new Date("2026-01-01T00:00:00.000Z"),
      rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
      to: new Date("2026-04-30T00:00:00.000Z"),
    });
    expect(result.get("groceries")).toBe(5_000);
  });

  it("buckets a transaction by its UTC month, not the local month", () => {
    const rows = [
      outgoing(-12_000, "groceries", "2026-08-31T23:30:00.000Z"),
      outgoing(-6_000, "groceries", "2026-09-15T10:00:00.000Z"),
    ];
    const result = outgoingByCategory(rows, {
      aggregation: "average",
      from: new Date("2026-08-01T00:00:00.000Z"),
      rule: { anchor: "DAY_OF_MONTH", startDay: 1 },
      to: new Date("2026-09-30T00:00:00.000Z"),
    });
    expect(result.get("groceries")).toBe(9_000);
  });
});
