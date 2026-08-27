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
  BOUSFRPP: true,
} as const satisfies Record<string, true>;

const NAME_PATTERNS = {
  boursobank: true,
  boursorama: true,
} as const satisfies Record<string, true>;

// ── Regex patterns (top-level, never constructed in loops) ──────────────

/** CARTE date variants: DD/MM/YY, DDMMYY, DD/MM/YYYY, DDMMYYYY */
const CARTE_RE =
  /^CARTE\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)(?:\s+\d+)?(?:\s+CB\*(?<card>\d{4}))?\s*$/iu;

const RETRAIT_RE =
  /^RETRAIT\s+DAB\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)\s+CB\*(?<card>\d{4,})\s*$/iu;

const AVOIR_RE =
  /^AVOIR\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)\s+CB\*(?<card>\d{4,})\s*$/iu;

const PRLV_RE = /^PRLV\s+SEPA\s+(?<payee>.+)/iu;
const VIR_RE = /^VIR(?:\s+(?:SEPA|INST))?\s+(?<payee>.+)/iu;
const ECH_PRET_RE = /^ECH\s+PRET\s*:\s*(?<payee>.+)/iu;
const REF_LINE_RE = /^R[ée]f\s*:\s/iu;

/** Backslash-delimited localisation suffix: `\PARIS\ FR` */
const BACKSLASH_LOC_RE = /\\.+$/u;

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a Boursorama date string (DD/MM/YY, DDMMYY, DD/MM/YYYY, DDMMYYYY)
 * into ISO yyyy-mm-dd when unambiguous.
 */
const parseBoursoDate = (raw: string): string | undefined => {
  const digits = raw.replaceAll("/", "");
  if (digits.length === 6) {
    return `20${digits.slice(4, 6)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return undefined;
};

/** Strip backslash-delimited town/country suffix. */
const stripLocation = (text: string): string =>
  text.replace(BACKSLASH_LOC_RE, "").trim();

const PATTERNS: readonly PatternRule[] = [
  { channel: "atm", dateParser: parseBoursoDate, re: RETRAIT_RE },
  { channel: "card", dateParser: parseBoursoDate, re: AVOIR_RE },
  { channel: "card", dateParser: parseBoursoDate, re: CARTE_RE },
  { channel: "direct-debit", re: PRLV_RE },
  { channel: "transfer", re: VIR_RE },
  { channel: "loan", re: ECH_PRET_RE },
];

// ── Parser ───────────────────────────────────────────────────────────────

export const boursorama: InstitutionParser = {
  id: "boursorama",

  matches(input: DescriptorParseInput): boolean {
    if (input.institutionBic) {
      // SAFETY: BIC prefix is an arbitrary string; the assertion only narrows for the const lookup
      const bic8 = input.institutionBic
        .slice(0, 8)
        .toUpperCase() as keyof typeof BIC_PREFIXES;
      if (BIC_PREFIXES[bic8] === true) {
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
      if (REF_LINE_RE.test(line)) {
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
        payee = stripLocation(p);
        if (ch !== "unknown") {
          channel = ch;
        }
        cardLast4 = card;
        labelDate = date;
        continue;
      }

      // No institution-specific pattern matched — detect channel from verb prefix
      const { channel: verbChannel, text: stripped } = stripVerbPrefix(line);
      if (verbChannel !== "unknown") {
        if (channel === "unknown") {
          channel = verbChannel;
        }
        const cleaned = stripLocation(cleanTrailingNoise(stripped));
        if (cleaned.length > 0 && !payee) {
          payee = cleaned;
        } else {
          droppedLines.push(line);
        }
      } else if (payee) {
        droppedLines.push(line);
      } else {
        payee = stripLocation(line);
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
      parserId: "boursorama",
      payeeText: payee,
    };
  },
};
