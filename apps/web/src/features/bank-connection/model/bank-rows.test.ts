import { describe, expect, test } from "bun:test";

import { buildBankRows } from "./bank-rows";
import type { BankConnection, BankInstitution } from "./use-bank-connections";

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
  institutionCountry: "FR",
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
      [connection("beta")],
      "en"
    );

    expect(rows.map((row) => row.name)).toEqual(["beta", "alpha", "gamma"]);
    expect(rows[0]?.connection?.id).toBe("beta");
    expect(rows[1]?.connection).toBeNull();
  });

  test("a connected institution is never offered twice", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("alpha")],
      "en"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.connection?.id).toBe("alpha");
  });

  test("a connection the provider no longer lists keeps a row", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("delisted", { institutionName: "Delisted Bank" })],
      "en"
    );

    expect(rows.map((row) => row.name)).toEqual(["Delisted Bank", "alpha"]);
    expect(rows[0]?.institution).toBeNull();
  });

  test("a connection without an institution id keeps a row", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [
        connection("legacy", {
          institutionId: null,
          institutionName: "Legacy",
        }),
      ],
      "en"
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
      ],
      "en"
    );

    expect(rows[0]?.description).toBe("2 accounts · Not synced yet");
    expect(rows[1]?.description).toBe("ALPHAXXX");
  });

  test("a connection that stopped importing says so", () => {
    const rows = buildBankRows(
      [institution("alpha")],
      [connection("alpha", { status: "EXPIRED" })],
      "en"
    );

    expect(rows[0]?.description).toBe(
      "1 account · Reconnect to resume importing"
    );
  });

  test("the same bank in two countries stays two rows", () => {
    const rows = buildBankRows(
      [institution("n26"), institution("n26", { country: "DE" })],
      [],
      "en"
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.institution?.country)).toEqual(["FR", "DE"]);

    const idsReactWillKeyOn = new Set(rows.map((row) => row.id));

    expect(idsReactWillKeyOn.size).toBe(2);
  });

  test("connecting a bank in one country leaves the other on offer", () => {
    const rows = buildBankRows(
      [institution("n26"), institution("n26", { country: "DE" })],
      [connection("n26")],
      "en"
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.connection?.id).toBe("n26");
    expect(rows[1]?.institution?.country).toBe("DE");
  });

  test("a list spanning countries names the one each bank links", () => {
    const rows = buildBankRows(
      [institution("alpha"), institution("beta", { bic: null, country: "DE" })],
      [],
      "en"
    );

    expect(rows[0]?.description).toBe("France · ALPHAXXX");
    expect(rows[1]?.description).toBe("Germany");
  });
});
