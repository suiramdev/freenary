import { normaliseDescriptor } from "../normalise-descriptor";
import type {
  DescriptorParseInput,
  DescriptorParseResult,
  InstitutionParser,
  TransactionChannel,
} from "../types";
import type { PatternRule } from "./generic";
import { cleanTrailingNoise, matchPatterns, stripVerbPrefix } from "./generic";

const BIC_PREFIXES = {
  AGRIFR: true,
  AGRIFRPP: true,
} as const satisfies Record<string, true>;

const NAME_PATTERNS = {
  "ca-": true,
  "credit agricole": true,
  "crédit agricole": true,
} as const satisfies Record<string, true>;

// ── Regex patterns ───────────────────────────────────────────────────────

/** PAIEMENT PAR CARTE payee DD/MM — date is a SUFFIX, no year. */
const CARTE_RE =
  /^PAIEMENT\s+PAR\s+CARTE\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2})\s*$/iu;

/** PRELEVEMENT payee DD/MM/YYYY */
const PRELEV_FULL_RE =
  /^PRELEVEMENT\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2}\/\d{4})\s*$/iu;

/** PRELEVEMENT payee DD-MM */
const PRELEV_SHORT_RE =
  /^PRELEVEMENT\s+(?<payee>.+?)\s+(?<date>\d{2}-\d{2})\s*$/iu;

/** Simple PRELEVEMENT with no date */
const PRELEV_BARE_RE = /^PRELEVEMENT\s+(?<payee>.+)/iu;

const VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// ── Helpers ──────────────────────────────────────────────────────────────

/** Parse DD/MM/YYYY → yyyy-mm-dd. Day+month only → undefined. */
const parseCaDate = (raw: string): string | undefined => {
  const parts = raw.split(/[/-]/u);
  if (parts.length === 3 && parts[2]?.length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return undefined;
};

const PATTERNS: readonly PatternRule[] = [
  { channel: "card", re: CARTE_RE },
  { channel: "direct-debit", dateParser: parseCaDate, re: PRELEV_FULL_RE },
  { channel: "direct-debit", re: PRELEV_SHORT_RE },
  { channel: "direct-debit", re: PRELEV_BARE_RE },
  { channel: "atm", re: RETRAIT_RE },
  { channel: "transfer", re: VIR_RE },
  { channel: "cheque", re: CHQ_RE },
  { channel: "fee", re: FRAIS_RE },
];

// ── Parser ───────────────────────────────────────────────────────────────

export const creditAgricole: InstitutionParser = {
  id: "credit-agricole",

  matches(input: DescriptorParseInput): boolean {
    if (input.institutionBic) {
      // SAFETY: BIC prefix is an arbitrary string; the assertion only narrows for the const lookup
      const bic8 = input.institutionBic
        .slice(0, 8)
        .toUpperCase() as keyof typeof BIC_PREFIXES;
      if (BIC_PREFIXES[bic8] === true) {
        return true;
      }
      // SAFETY: same narrowing for the 6-char prefix
      const bic6 = input.institutionBic
        .slice(0, 6)
        .toUpperCase() as keyof typeof BIC_PREFIXES;
      if (BIC_PREFIXES[bic6] === true) {
        return true;
      }
    }
    const lower = input.institutionName
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase();
    for (const name of Object.keys(NAME_PATTERNS)) {
      const normalised = name
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036F]/gu, "");
      if (lower.includes(normalised)) {
        return true;
      }
    }
    return false;
  },

  parse(input: DescriptorParseInput): DescriptorParseResult {
    const droppedLines: string[] = [];
    let payee: string | null = null;
    let channel: TransactionChannel = "unknown";
    let labelDate: string | undefined;

    for (const raw of input.remittanceLines) {
      const line = raw.trim();
      if (line.length === 0) {
        droppedLines.push(line);
        continue;
      }

      const match = matchPatterns(line, PATTERNS);
      if (match) {
        const { channel: ch, labelDate: date, payee: p } = match;
        payee = p;
        if (ch !== "unknown") {
          channel = ch;
        }
        labelDate = date;
        continue;
      }

      const { channel: verbChannel, text: stripped } = stripVerbPrefix(line);
      if (verbChannel !== "unknown") {
        if (channel === "unknown") {
          channel = verbChannel;
        }
        const cleaned = cleanTrailingNoise(stripped);
        if (cleaned.length > 0 && !payee) {
          payee = cleaned;
        } else {
          droppedLines.push(line);
        }
      } else if (payee) {
        droppedLines.push(line);
      } else {
        payee = line;
      }
    }

    if (!payee || payee.length === 0) {
      payee = (input.creditorName ?? input.debtorName ?? null)?.trim() ?? null;
      if (payee?.length === 0) {
        payee = null;
      }
    }

    return {
      channel,
      droppedLines,
      labelDate,
      normalisedDescriptor: payee ? normaliseDescriptor(payee) : "",
      parserId: "credit-agricole",
      payeeText: payee,
    };
  },
};
