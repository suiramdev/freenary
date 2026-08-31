import { describe, expect, test } from "bun:test";

import type {
  BankConnection,
  BankInstitution,
} from "@/hooks/bank/use-bank-connections";

import { buildBankRows } from "./bank-rows";

const institution = (
  id: string,
  overrides: Partial<BankInstitution> = {}
): BankInstitution => ({
  bic: `${id.toUpperCase()}XXX`,
  country: "FR",
  id,
  logo: null,
  name: id,
  ...overrides,
});

const connection = (
  id: string,
  overrides: Partial<BankConnection> = {}
): BankConnection => ({
  accounts: [{ iban: null, id: `${id}-account`, name: null }],
  id,
  institutionId: id,
  institutionName: id,
  lastSyncedAt: null,
  status: "ACTIVE",
  ...overrides,
});

describe("buildBankRows", () => {
  test("connected banks come first and carry their connection", () => {
    const rows = buildBankRows(
      [institution("alpha"), institution("beta"), institution("gamma")],
      [connection("beta")]
    );

    expect(rows.map((row) => row.name)).toEqual(["beta", "alpha", "gamma"]);
    expect(rows[0]?.connection?.id).toBe("beta");
    expect(rows[1]?.connection).toBeNull();
  });

  test("a connected institution is never offered twice", () => {
    const rows = buildBankRows([institution("alpha")], [connection("alpha")]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.connection?.id).toBe("alpha");
  });

  test("a connection the provider no longer lists keeps a row", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("delisted", { institutionName: "Delisted Bank" })]
    );

    expect(rows.map((row) => row.name)).toEqual(["Delisted Bank", "alpha"]);
    expect(rows[0]?.institution).toBeNull();
  });

  test("a connection without an institution id keeps a row", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("legacy", { institutionId: null, institutionName: "Legacy" })]
    );

    expect(rows.map((row) => row.name)).toEqual(["Legacy", "alpha"]);
  });

  test("the description is the BIC until the bank is connected", () => {
    const rows = buildBankRows(
      [institution("alpha"), institution("beta")],
      [
        connection("beta", {
          accounts: [
            { iban: null, id: "one", name: null },
            { iban: null, id: "two", name: null },
          ],
        }),
      ]
    );

    expect(rows[0]?.description).toBe("2 accounts · Not synced yet");
    expect(rows[1]?.description).toBe("ALPHAXXX");
  });

  test("a connection that stopped importing says so", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("alpha", { status: "EXPIRED" })]
    );

    expect(rows[0]?.description).toBe(
      "1 account · Reconnect to resume importing"
    );
  });
});
