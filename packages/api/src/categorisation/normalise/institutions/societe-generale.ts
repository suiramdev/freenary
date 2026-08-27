import { normaliseDescriptor } from "../normalise-descriptor";
import type {
  DescriptorParseInput,
  DescriptorParseResult,
  InstitutionParser,
  TransactionChannel,
} from "../types";
import type { PatternRule } from "./generic";
import {
  capture,
  cleanTrailingNoise,
  matchPatterns,
  stripVerbPrefix,
} from "./generic";

const BIC_PREFIXES = {
  SOGEFR: true,
  SOGEFRPP: true,
} as const satisfies Record<string, true>;

const NAME_PATTERNS = {
  "sg ": true,
  "societe generale": true,
  "société générale": true,
} as const satisfies Record<string, true>;

// ── Regex patterns ───────────────────────────────────────────────────────

/** CARTE cardToken DD/MM payee — card before date, no year. */
const CARTE_RE =
  /^CARTE\s+(?<card>\w+)\s+(?<date>\d{2}\/\d{2})\s+(?<payee>.+)\s*$/iu;

/** YYYY/payee (bare date-prefixed format) */
const DATE_SLASH_RE = /^(?<date>\d{4})\/(?<payee>.+)\s*$/u;

/** VIR POUR: payee REF: ... MOTIF: motif */
const VIR_POUR_RE =
  /^VIR\s+POUR\s*:\s*(?<payee>.+?)\s+REF\s*:\s*\S+\s+MOTIF\s*:\s*(?<motif>.+)\s*$/iu;

const VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

const PATTERNS: readonly PatternRule[] = [
  { channel: "card", re: CARTE_RE },
  {
    channel: "transfer",
    extractPayee: (groups) =>
      capture(groups, "motif") ?? capture(groups, "payee"),
    re: VIR_POUR_RE,
  },
  { channel: "unknown", re: DATE_SLASH_RE },
  { channel: "direct-debit", re: PRLV_RE },
  { channel: "atm", re: RETRAIT_RE },
  { channel: "transfer", re: VIR_RE },
  { channel: "fee", re: FRAIS_RE },
];

// ── Parser ───────────────────────────────────────────────────────────────

export const societeGenerale: InstitutionParser = {
  id: "societe-generale",

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
      parserId: "societe-generale",
      payeeText: payee,
    };
  },
};
