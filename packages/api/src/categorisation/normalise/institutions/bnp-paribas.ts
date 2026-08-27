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
  BNPAFR: true,
  BNPAFRPP: true,
} as const satisfies Record<string, true>;

const NAME_PATTERNS = {
  bnp: true,
  "bnp paribas": true,
} as const satisfies Record<string, true>;

// ── Regex patterns ───────────────────────────────────────────────────────

/** FACTURE CARTE DU DDMMYY payee CARTE 1234 */
const FACTURE_RE =
  /^FACTURE\s+CARTE\s+DU\s+(?<date>\d{6})\s+(?<payee>.+?)(?:\s+CARTE\s+(?<card>\d{4}))?\s*$/iu;

/** PRLV [EUROPEEN] SEPA payee [MDT/...] [ECH/...] [ID ...] */
const PRLV_RE =
  /^PRLV(?:\s+EUROPEEN)?\s+SEPA\s+(?<payee>.+?)(?:\s+MDT\/\S+)?(?:\s+ECH\/\S+)?(?:\s+ID\s+\S+)?\s*$/iu;

const VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+|INST\s+)?(?<payee>.+)/iu;
const RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const CHQ_RE = /^CHQ?\s+(?<payee>.+)/iu;
const FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// ── Helpers ──────────────────────────────────────────────────────────────

const parseBnpDate = (raw: string): string | undefined => {
  if (raw.length === 6) {
    return `20${raw.slice(4, 6)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`;
  }
  return undefined;
};

const PATTERNS: readonly PatternRule[] = [
  { channel: "card", dateParser: parseBnpDate, re: FACTURE_RE },
  { channel: "direct-debit", re: PRLV_RE },
  { channel: "atm", re: RETRAIT_RE },
  { channel: "transfer", re: VIR_RE },
  { channel: "cheque", re: CHQ_RE },
  { channel: "fee", re: FRAIS_RE },
];

// ── Parser ───────────────────────────────────────────────────────────────

export const bnpParibas: InstitutionParser = {
  id: "bnp-paribas",

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
    let cardLast4: string | undefined;
    let labelDate: string | undefined;

    for (const raw of input.remittanceLines) {
      const line = raw.trim();
      if (line.length === 0) {
        droppedLines.push(line);
        continue;
      }

      const match = matchPatterns(line, PATTERNS);
      if (match) {
        const {
          cardLast4: card,
          channel: ch,
          labelDate: date,
          payee: p,
        } = match;
        payee = p;
        if (ch !== "unknown") {
          channel = ch;
        }
        cardLast4 = card;
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
      cardLast4,
      channel,
      droppedLines,
      labelDate,
      normalisedDescriptor: payee ? normaliseDescriptor(payee) : "",
      parserId: "bnp-paribas",
      payeeText: payee,
    };
  },
};
