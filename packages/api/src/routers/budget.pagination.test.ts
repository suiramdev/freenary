import { describe, expect, test } from "bun:test";

import { transactionPage } from "../lib/transaction-page";

type Row = { readonly date: string; readonly id: string };

const row = (index: number): Row => ({
  date: `2026-09-${String(10 - index).padStart(2, "0")}T10:00:00.000Z`,
  id: `tx-${String(index).padStart(2, "0")}`,
});

/**
 * Mimics the router's keyset fetch: the cursor row itself is skipped
 * (Prisma `skip: 1`) and the next `limit + 1` rows are read.
 */
const fetchPage = (
  all: readonly Row[],
  cursor: string | null,
  limit: number,
): Row[] => {
  const start =
    cursor === null ? 0 : all.findIndex((item) => item.id === cursor) + 1;
  return all.slice(start, start + limit + 1);
};

describe("budget transactions pagination", () => {
  test("two consecutive pages cover every row once, with no gap", () => {
    const all = Array.from({ length: 7 }, (_, index) => row(index));
    const limit = 3;

    const firstFetched = fetchPage(all, null, limit);
    const first = transactionPage(firstFetched, limit);
    expect(first.transactions.map((item) => item.id)).toEqual([
      "tx-00",
      "tx-01",
      "tx-02",
    ]);
    expect(first.nextCursor).toBe("tx-02");

    const secondFetched = fetchPage(all, first.nextCursor, limit);
    const second = transactionPage(secondFetched, limit);
    expect(second.transactions.map((item) => item.id)).toEqual([
      "tx-03",
      "tx-04",
      "tx-05",
    ]);
    expect(second.nextCursor).toBe("tx-05");

    const thirdFetched = fetchPage(all, second.nextCursor, limit);
    const third = transactionPage(thirdFetched, limit);
    expect(third.transactions.map((item) => item.id)).toEqual(["tx-06"]);
    expect(third.nextCursor).toBeNull();

    // No gap and no duplicate across the pages (regression for #154).
    const seen = [
      ...first.transactions,
      ...second.transactions,
      ...third.transactions,
    ];
    expect(seen.map((item) => item.id)).toEqual(all.map((item) => item.id));
  });

  test("a page that fits in the limit has no next cursor", () => {
    const all = [row(0), row(1)];
    const page = transactionPage(all, 3);
    expect(page.nextCursor).toBeNull();
    expect(page.transactions).toEqual(all);
  });

  test("exactly limit rows has no next cursor", () => {
    const all = [row(0), row(1), row(2)];
    const page = transactionPage(all, 3);
    expect(page.nextCursor).toBeNull();
    expect(page.transactions).toEqual(all);
  });

  test("the next cursor is the last row of the returned page", () => {
    const all = [row(0), row(1), row(2), row(3)];
    const page = transactionPage(all, 3);
    expect(page.transactions.map((item) => item.id)).toEqual([
      "tx-00",
      "tx-01",
      "tx-02",
    ]);
    expect(page.nextCursor).toBe("tx-02");
  });
});
