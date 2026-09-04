import { describe, expect, test } from "bun:test";

import { mapPowensConnection } from "./map-connection";

describe("mapPowensConnection", () => {
  test("keeps the accounts the user activated, named as the provider names them", () => {
    const connection = mapPowensConnection({
      accounts: [
        { iban: "FR7612345", id: 11, name: "Compte courant" },
        { id: 12, name: null, original_name: "PEA" },
        { deleted: "2026-03-05 10:00:00", id: 13, name: "Old" },
      ],
      connector: { name: "Connecteur de test" },
      id: 99,
    });

    expect(connection).toEqual({
      accounts: [
        {
          iban: "FR7612345",
          name: "Compte courant",
          providerAccountId: "11",
        },
        { iban: undefined, name: "PEA", providerAccountId: "12" },
      ],
      institutionName: "Connecteur de test",
      providerSessionId: "99",
    });
  });

  test("leaves the institution name empty when the connector is not expanded", () => {
    expect(mapPowensConnection({ id: 1 }).institutionName).toBe("");
  });
});
