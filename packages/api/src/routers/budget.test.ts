import { describe, expect, it } from "bun:test";

import { countedTransactionsWhere } from "./budget";

describe("countedTransactionsWhere", () => {
  it("leaves paired internal transfers out of the user's period", () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-10-31T23:59:59.999Z");

    expect(countedTransactionsWhere("user", from, to)).toEqual({
      account: { connection: { userId: "user" } },
      date: { gte: from, lte: to },
      isInternalTransfer: false,
    });
  });
});
