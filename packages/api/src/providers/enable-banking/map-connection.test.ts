import { describe, expect, test } from "bun:test";

import { mapEBCompletedConnection } from "./map-connection";

describe("mapEBCompletedConnection", () => {
  test("maps the account IBAN from account_id", () => {
    const connection = mapEBCompletedConnection({
      accounts: [
        {
          account_id: { iban: "FR761234" },
          name: "Current account",
          uid: "account-1",
        },
      ],
      aspsp: { name: "Provider Bank" },
      session_id: "session-1",
    });

    expect(connection).toEqual({
      accounts: [
        {
          iban: "FR761234",
          name: "Current account",
          providerAccountId: "account-1",
        },
      ],
      institutionName: "Provider Bank",
      providerSessionId: "session-1",
    });
  });
});
