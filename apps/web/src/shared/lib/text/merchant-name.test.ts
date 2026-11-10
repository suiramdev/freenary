import { describe, expect, it } from "bun:test";

import { merchantName, readableName } from "./merchant-name";

describe("readableName", () => {
  it("capitalises each word of an all-lowercase name", () => {
    expect(readableName("carrefour market")).toBe("Carrefour Market");
  });

  it("capitalises each word of an all-uppercase name", () => {
    expect(readableName("FREE  MOBILE")).toBe("Free Mobile");
  });

  it("keeps a name the bank already wrote in mixed case", () => {
    expect(readableName("McDonald's Paris")).toBe("McDonald's Paris");
  });

  it("leaves a word holding digits as it is", () => {
    expect(readableName("FR7630006000011234567890189")).toBe(
      "FR7630006000011234567890189"
    );
  });
});

describe("merchantName", () => {
  it("prefers the counterparty the bank names", () => {
    expect(
      merchantName({
        counterpartyName: "QUENTIN PERROT",
        description: "VIR SEPA EMIS VERS ASSURANCE VIE",
        normalisedDescriptor: "emis vers assurance vie",
      })
    ).toBe("Quentin Perrot");
  });

  it("falls back to the cleaned descriptor of a card payment", () => {
    expect(
      merchantName({
        counterpartyName: null,
        description: "PAIEMENT CB 1011 CARREFOUR MARKET CARTE 9896",
        normalisedDescriptor: "carrefour market",
      })
    ).toBe("Carrefour Market");
  });

  it("falls back to the bank's description when nothing cleaner exists", () => {
    expect(
      merchantName({
        counterpartyName: " ",
        description: "RETRAIT DAB",
        normalisedDescriptor: null,
      })
    ).toBe("Retrait Dab");
  });
});
