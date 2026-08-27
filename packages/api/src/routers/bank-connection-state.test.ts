import { describe, expect, test } from "bun:test";

import type { ProviderInstitution } from "../providers/types";
import {
  encodeBankConnectionState,
  findInstitution,
  parseBankConnectionState,
} from "./bank-connection-state";

const institution: ProviderInstitution = {
  country: "FR",
  id: "bank-id",
  name: "Canonical Bank",
};

describe("bank connection state", () => {
  test("encodes canonical institution data and preserves original state", () => {
    const state = parseBankConnectionState(
      encodeBankConnectionState("enable-banking", institution, "csrf-state")
    );

    expect(state).toEqual({
      institution,
      original: "csrf-state",
      providerId: "enable-banking",
    });
  });

  test("only resolves an institution for the canonical id and country", () => {
    expect(findInstitution([institution], "bank-id", "FR")).toEqual(
      institution
    );
    expect(findInstitution([institution], "bank-id", "DE")).toBeUndefined();
    expect(findInstitution([institution], "other-bank", "FR")).toBeUndefined();
  });

  test("rejects legacy display-name-only state", () => {
    expect(() =>
      parseBankConnectionState('{"bankName":"Untrusted"}')
    ).toThrow();
  });
});
