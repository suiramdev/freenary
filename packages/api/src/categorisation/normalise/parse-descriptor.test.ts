import { describe, expect, it } from "bun:test";

import { parseDescriptor } from "./parse-descriptor";
import type { DescriptorParseInput } from "./types";

const input = (
  overrides: Partial<DescriptorParseInput> & {
    remittanceLines: readonly string[];
  }
): DescriptorParseInput => ({
  amountMinor: overrides.amountMinor ?? -1500,
  institutionName: overrides.institutionName ?? "Unknown Bank",
  ...overrides,
});

// ── Boursorama ───────────────────────────────────────────────────────────

describe("boursorama", () => {
  it("parses CARTE with date and card suffix", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["CARTE 01/03/25 CARREFOUR MARKET 4587 CB*4567"],
      })
    );
    expect(result.payeeText).toBe("CARREFOUR MARKET");
    expect(result.normalisedDescriptor).toBe("carrefour market");
    expect(result.channel).toBe("card");
    expect(result.cardLast4).toBe("4567");
    expect(result.labelDate).toBe("2025-03-01");
    expect(result.parserId).toBe("boursorama");
  });

  it("parses RETRAIT DAB as atm channel", () => {
    const result = parseDescriptor(
      input({
        institutionName: "BoursoBank",
        remittanceLines: ["RETRAIT DAB 15/04/25 DISTRIBUTEUR BNP CB*1234"],
      })
    );
    expect(result.channel).toBe("atm");
    expect(result.cardLast4).toBe("1234");
    expect(result.parserId).toBe("boursorama");
  });

  it("parses PRLV SEPA as direct-debit", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["PRLV SEPA EDF CLIENTS PARTICULIERS"],
      })
    );
    expect(result.payeeText).toBe("EDF CLIENTS PARTICULIERS");
    expect(result.normalisedDescriptor).toBe("edf clients particuliers");
    expect(result.channel).toBe("direct-debit");
  });

  it("strips backslash-delimited localisation", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["CARTE 10/05/25 MONOPRIX\\PARIS 15\\ FR CB*9999"],
      })
    );
    expect(result.payeeText).toBe("MONOPRIX");
    expect(result.channel).toBe("card");
  });

  it("drops Réf lines as noise", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: [
          "Réf : 12345678",
          "CARTE 01/03/25 BOULANGERIE PAUL CB*4567",
        ],
      })
    );
    expect(result.payeeText).toBe("BOULANGERIE PAUL");
    expect(result.droppedLines).toContain("Réf : 12345678");
  });

  it("matches on BIC prefix", () => {
    const result = parseDescriptor(
      input({
        institutionBic: "BOUSFRPPXXX",
        institutionName: "Some Random Name",
        remittanceLines: ["CARTE 01/03/25 FNAC CB*1111"],
      })
    );
    expect(result.parserId).toBe("boursorama");
  });

  it("parses VIR SEPA as transfer", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["VIR SEPA JEAN DUPONT"],
      })
    );
    expect(result.channel).toBe("transfer");
    expect(result.payeeText).toBe("JEAN DUPONT");
  });

  it("parses ECH PRET as loan", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["ECH PRET: CREDIT IMMOBILIER"],
      })
    );
    expect(result.channel).toBe("loan");
  });

  it("handles CARTE with DDMMYY format (no slashes)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["CARTE 010325 CARREFOUR CB*4567"],
      })
    );
    expect(result.payeeText).toBe("CARREFOUR");
    expect(result.labelDate).toBe("2025-03-01");
    expect(result.channel).toBe("card");
  });
});

// ── BNP Paribas ──────────────────────────────────────────────────────────

describe("bnp-paribas", () => {
  it("parses FACTURE CARTE DU with date and card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "BNP Paribas",
        remittanceLines: [
          "FACTURE CARTE DU 150325 PHARMACIE LAFAYETTE CARTE 7890",
        ],
      })
    );
    expect(result.payeeText).toBe("PHARMACIE LAFAYETTE");
    expect(result.normalisedDescriptor).toBe("pharmacie lafayette");
    expect(result.channel).toBe("card");
    expect(result.cardLast4).toBe("7890");
    expect(result.labelDate).toBe("2025-03-15");
    expect(result.parserId).toBe("bnp-paribas");
  });

  it("parses PRLV EUROPEEN SEPA with metadata suffixes", () => {
    const result = parseDescriptor(
      input({
        institutionName: "BNP Paribas",
        remittanceLines: [
          "PRLV EUROPEEN SEPA FREE MOBILE MDT/123 ECH/456 ID ABC",
        ],
      })
    );
    expect(result.payeeText).toBe("FREE MOBILE");
    expect(result.channel).toBe("direct-debit");
  });

  it("matches on BIC", () => {
    const result = parseDescriptor(
      input({
        institutionBic: "BNPAFRPPXXX",
        institutionName: "Unknown",
        remittanceLines: ["FACTURE CARTE DU 010125 SEPHORA CARTE 5555"],
      })
    );
    expect(result.parserId).toBe("bnp-paribas");
  });
});

// ── Crédit Agricole ──────────────────────────────────────────────────────

describe("credit-agricole", () => {
  it("parses PAIEMENT PAR CARTE with date suffix (DD/MM, no year)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Crédit Agricole",
        remittanceLines: ["PAIEMENT PAR CARTE MONOPRIX PARIS 15 12/03"],
      })
    );
    expect(result.payeeText).toBe("MONOPRIX PARIS 15");
    expect(result.normalisedDescriptor).toBe("monoprix paris");
    expect(result.channel).toBe("card");
    // DD/MM only — no year, so labelDate is undefined
    expect(result.labelDate).toBeUndefined();
    expect(result.parserId).toBe("credit-agricole");
  });

  it("parses PRELEVEMENT with DD/MM/YYYY date", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Crédit Agricole",
        remittanceLines: ["PRELEVEMENT EDF CLIENTS 15/03/2025"],
      })
    );
    expect(result.payeeText).toBe("EDF CLIENTS");
    expect(result.channel).toBe("direct-debit");
    expect(result.labelDate).toBe("2025-03-15");
  });

  it("parses PRELEVEMENT with DD-MM date (no year)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Crédit Agricole",
        remittanceLines: ["PRELEVEMENT NETFLIX 15-03"],
      })
    );
    expect(result.payeeText).toBe("NETFLIX");
    expect(result.channel).toBe("direct-debit");
    expect(result.labelDate).toBeUndefined();
  });
});

// ── Société Générale ─────────────────────────────────────────────────────

describe("societe-generale", () => {
  it("parses CARTE with card token before date", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Société Générale",
        remittanceLines: ["CARTE X1234 15/03 BOULANGERIE DUPONT"],
      })
    );
    expect(result.payeeText).toBe("BOULANGERIE DUPONT");
    expect(result.channel).toBe("card");
    expect(result.cardLast4).toBe("X1234");
    expect(result.parserId).toBe("societe-generale");
  });

  it("parses VIR POUR with REF and MOTIF", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Société Générale",
        remittanceLines: [
          "VIR POUR: JEAN DUPONT REF: ABC123 MOTIF: LOYER MARS",
        ],
      })
    );
    expect(result.payeeText).toBe("LOYER MARS");
    expect(result.channel).toBe("transfer");
  });

  it("parses bare date/payee format", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Société Générale",
        remittanceLines: ["0315/MONOPRIX PARIS"],
      })
    );
    expect(result.payeeText).toBe("MONOPRIX PARIS");
  });
});

// ── Crédit Mutuel / CIC ─────────────────────────────────────────────────

describe("credit-mutuel", () => {
  it("parses PAIEMENT CB with card after merchant", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Crédit Mutuel",
        remittanceLines: ["PAIEMENT CB 1503 INTERMARCHE CARTE 4567"],
      })
    );
    expect(result.payeeText).toBe("INTERMARCHE");
    expect(result.channel).toBe("card");
    expect(result.cardLast4).toBe("4567");
    expect(result.parserId).toBe("credit-mutuel");
  });

  it("matches CIC by name", () => {
    const result = parseDescriptor(
      input({
        institutionName: "CIC",
        remittanceLines: ["PAIEMENT PSC 0115 SNCF PAYWEB9876"],
      })
    );
    expect(result.parserId).toBe("credit-mutuel");
    expect(result.payeeText).toBe("SNCF");
    expect(result.cardLast4).toBe("9876");
  });

  it("no year from 4-digit date — labelDate undefined", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Crédit Mutuel",
        remittanceLines: ["PAIEMENT CB 1503 AUCHAN CARTE 1111"],
      })
    );
    expect(result.labelDate).toBeUndefined();
  });
});

// ── LCL ──────────────────────────────────────────────────────────────────

describe("lcl", () => {
  it("parses CB payee DD/MM/YY (date as suffix)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "LCL",
        remittanceLines: ["CB BOULANGER 15/03/25"],
      })
    );
    expect(result.payeeText).toBe("BOULANGER");
    expect(result.channel).toBe("card");
    expect(result.labelDate).toBe("2025-03-15");
    expect(result.parserId).toBe("lcl");
  });
});

// ── La Banque Postale ────────────────────────────────────────────────────

describe("la-banque-postale", () => {
  it("parses ACHAT CB payee DD.MM.YY (dot dates)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "La Banque Postale",
        remittanceLines: ["ACHAT CB PHARMACIE DE LA GARE 03.04.25"],
      })
    );
    expect(result.payeeText).toBe("PHARMACIE DE LA GARE");
    expect(result.normalisedDescriptor).toBe("pharmacie gare");
    expect(result.channel).toBe("card");
    expect(result.labelDate).toBe("2025-04-03");
    expect(result.parserId).toBe("la-banque-postale");
  });
});

// ── Generic fallback ─────────────────────────────────────────────────────

describe("generic", () => {
  it("falls back to generic for unknown institutions", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Sparkasse",
        remittanceLines: ["PRLV SEPA NETFLIX"],
      })
    );
    expect(result.parserId).toBe("generic");
    expect(result.payeeText).toBe("NETFLIX");
    expect(result.channel).toBe("direct-debit");
  });

  it("uses creditorName when no label yields payee", () => {
    const result = parseDescriptor(
      input({
        creditorName: "AMAZON EU SARL",
        institutionName: "Unknown Bank",
        remittanceLines: ["CARTE"],
      })
    );
    expect(result.payeeText).toBe("AMAZON EU SARL");
  });

  it("uses debtorName when creditorName is absent", () => {
    const result = parseDescriptor(
      input({
        debtorName: "JEAN DUPONT",
        institutionName: "Unknown Bank",
        remittanceLines: ["VIR"],
      })
    );
    expect(result.payeeText).toBe("JEAN DUPONT");
  });
});

// ── Cross-cutting requirements ───────────────────────────────────────────

describe("cross-cutting", () => {
  it("AMZN Mktp FR*308J preserves merchant left of *", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["AMZN Mktp FR*308J"],
      })
    );
    // normaliseDescriptor strips digit-bearing tokens (308J has digits)
    expect(result.normalisedDescriptor).toBe("amzn mktp fr");
    expect(result.payeeText).toBe("AMZN Mktp FR*308J");
  });

  it("handles unordered remittanceLines — label in position 2", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: [
          "Réf : 999999",
          "Identifiant compte: FR76123",
          "CARTE 01/03/25 CARREFOUR MARKET CB*4567",
        ],
      })
    );
    expect(result.payeeText).toBe("CARREFOUR MARKET");
    expect(result.channel).toBe("card");
    expect(result.droppedLines).toContain("Réf : 999999");
  });

  it("RETRAIT DAB yields channel atm", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["RETRAIT DAB 15/04/25 BNP PARIS CB*1234"],
      })
    );
    expect(result.channel).toBe("atm");
  });

  it("PRLV SEPA yields channel direct-debit", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["PRLV SEPA SFR"],
      })
    );
    expect(result.channel).toBe("direct-debit");
  });

  it("all-noise input yields payeeText null and does not throw", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["", "  "],
      })
    );
    expect(result.payeeText).toBeNull();
    expect(result.channel).toBe("unknown");
    expect(result.normalisedDescriptor).toBe("");
  });

  it("bare CARTE with no payee yields card channel", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["CARTE"],
      })
    );
    expect(result.channel).toBe("card");
    expect(result.payeeText).toBeNull();
  });

  it("empty remittanceLines does not throw", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: [],
      })
    );
    expect(result.payeeText).toBeNull();
    expect(result.normalisedDescriptor).toBe("");
  });

  it("every parser sets parserId to its own id", () => {
    const banks: [string, string, string | undefined][] = [
      ["Boursorama", "boursorama", undefined],
      ["BNP Paribas", "bnp-paribas", undefined],
      ["Crédit Agricole", "credit-agricole", undefined],
      ["Société Générale", "societe-generale", undefined],
      ["Crédit Mutuel", "credit-mutuel", undefined],
      ["LCL", "lcl", undefined],
      ["La Banque Postale", "la-banque-postale", undefined],
      ["Sparkasse", "generic", undefined],
    ];

    for (const [name, expectedId, bic] of banks) {
      const result = parseDescriptor(
        input({
          institutionBic: bic,
          institutionName: name,
          remittanceLines: ["SOME LABEL"],
        })
      );
      expect(result.parserId).toBe(expectedId);
    }
  });
});

// ── Channel verb regression (R2) ─────────────────────────────────────────

describe("channel verb detection", () => {
  it("RETRAIT DAB without date → atm (Boursorama regression)", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["RETRAIT DAB BNP PARIBAS PARIS CB*9876"],
      })
    );
    expect(result.channel).toBe("atm");
    expect(result.parserId).toBe("boursorama");
  });

  it("RETRAIT DAB without date → atm and extracts payee", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["RETRAIT DAB DISTRIBUTEUR BNP CB*1234"],
      })
    );
    expect(result.channel).toBe("atm");
    expect(result.payeeText).toBe("DISTRIBUTEUR BNP");
  });

  it("RETRAIT DAB with date → atm", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["RETRAIT DAB 01/03/25 DISTRIBUTEUR BNP CB*1234"],
      })
    );
    expect(result.channel).toBe("atm");
  });

  it("bare RETRAIT → atm", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["RETRAIT ESPECES GUICHET"],
      })
    );
    expect(result.channel).toBe("atm");
  });

  it("PRLV SEPA → direct-debit", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["PRLV SEPA FREE MOBILE"],
      })
    );
    expect(result.channel).toBe("direct-debit");
  });

  it("PRELEVEMENT → direct-debit", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["PRELEVEMENT EDF"],
      })
    );
    expect(result.channel).toBe("direct-debit");
  });

  it("VIR SEPA → transfer", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["VIR SEPA JEAN DUPONT"],
      })
    );
    expect(result.channel).toBe("transfer");
  });

  it("VIR INST → transfer", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["VIR INST JEAN DUPONT"],
      })
    );
    expect(result.channel).toBe("transfer");
  });

  it("VIR → transfer", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["VIR JEAN DUPONT"],
      })
    );
    expect(result.channel).toBe("transfer");
  });

  it("VIREMENT → transfer", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["VIREMENT JEAN DUPONT"],
      })
    );
    expect(result.channel).toBe("transfer");
  });

  it("CARTE → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["CARTE MONOPRIX PARIS"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("CB → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["CB MONOPRIX"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("ACHAT CB → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["ACHAT CB MONOPRIX"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("PAIEMENT PAR CARTE → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["PAIEMENT PAR CARTE MONOPRIX"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("PAIEMENT CB → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["PAIEMENT CB MONOPRIX"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("FACTURE CARTE → card", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["FACTURE CARTE MONOPRIX"],
      })
    );
    expect(result.channel).toBe("card");
  });

  it("ECH PRET: → loan", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["ECH PRET: CREDIT IMMOBILIER"],
      })
    );
    expect(result.channel).toBe("loan");
  });

  it("CHEQUE → cheque", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["CHEQUE 1234567"],
      })
    );
    expect(result.channel).toBe("cheque");
  });

  it("CHQ → cheque", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["CHQ 1234567"],
      })
    );
    expect(result.channel).toBe("cheque");
  });

  it("COTISATION → fee", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["COTISATION CARTE VISA"],
      })
    );
    expect(result.channel).toBe("fee");
  });

  it("FRAIS → fee", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["FRAIS TENUE DE COMPTE"],
      })
    );
    expect(result.channel).toBe("fee");
  });

  it("COMMISSION → fee", () => {
    const result = parseDescriptor(
      input({
        institutionName: "Unknown Bank",
        remittanceLines: ["COMMISSION INTERVENTION"],
      })
    );
    expect(result.channel).toBe("fee");
  });

  it("verb detection works for Boursorama even when detail patterns fail", () => {
    // VIR without SEPA/INST qualifier — not matched by Boursorama's VIR_RE
    // which requires SEPA or INST, but verb detection catches it
    const result = parseDescriptor(
      input({
        institutionName: "Boursorama",
        remittanceLines: ["PRLV SEPA SOME PROVIDER"],
      })
    );
    expect(result.channel).toBe("direct-debit");
    expect(result.parserId).toBe("boursorama");
  });

  it("verb detection works across institution parsers", () => {
    const banks = [
      "BNP Paribas",
      "Crédit Agricole",
      "Société Générale",
      "Crédit Mutuel",
      "LCL",
      "La Banque Postale",
    ];
    for (const bank of banks) {
      const result = parseDescriptor(
        input({
          institutionName: bank,
          remittanceLines: ["RETRAIT DAB SOME ATM"],
        })
      );
      expect(result.channel).toBe("atm");
    }
  });
});
