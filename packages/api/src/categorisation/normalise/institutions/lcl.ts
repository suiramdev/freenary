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
  CRLYFR: true,
  CRLYFRPP: true,
} as const satisfies Record<string, true>;

const NAME_PATTERNS = {
  lcl: true,
  "le credit lyonnais": true,
} as const satisfies Record<string, true>;

// ── Regex patterns ───────────────────────────────────────────────────────

/** CB payee DD/MM/YY — date is a SUFFIX. */
const CB_RE = /^CB\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2}\/\d{2})\s*$/iu;

const PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// ── Helpers ──────────────────────────────────────────────────────────────

const parseLclDate = (raw: string): string | undefined => {
  const parts = raw.split("/");
  if (parts.length === 3 && parts[2]?.length === 2) {
    return `20${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return undefined;
};

const PATTERNS: readonly PatternRule[] = [
  { channel: "card", dateParser: parseLclDate, re: CB_RE },
  { channel: "direct-debit", re: PRLV_RE },
  { channel: "atm", re: RETRAIT_RE },
  { channel: "transfer", re: VIR_RE },
  { channel: "cheque", re: CHQ_RE },
  { channel: "fee", re: FRAIS_RE },
];

// ── Parser ───────────────────────────────────────────────────────────────

export const lcl: InstitutionParser = {
  id: "lcl",

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
      if (lower.includes(name)) {
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
      parserId: "lcl",
      payeeText: payee,
    };
  },
};
