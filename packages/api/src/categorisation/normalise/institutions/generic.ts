import { normaliseDescriptor } from "../normalise-descriptor";
import type {
  DescriptorParseInput,
  DescriptorParseResult,
  InstitutionParser,
  TransactionChannel,
} from "../types";

/**
 * Channel-verb patterns, ordered longest-first to avoid partial matches.
 *
 * These detect the channel from the leading verb of any French bank descriptor.
 * Exported so institution parsers can fall back to verb detection when their
 * detail-extraction regexes (which may require dates, card tokens, etc.) don't match.
 */
const CHANNEL_VERB_PATTERNS: [RegExp, TransactionChannel][] = [
  [/^PAIEMENT\s+PAR\s+CARTE(?:\s+|$)/iu, "card"],
  [/^FACTURE\s+CARTE(?:\s+|$)/iu, "card"],
  [/^PAIEMENT\s+(?:PSC|CB|MOB)(?:\s+|$)/iu, "card"],
  [/^PRLV\s+(?:EUROPEEN\s+)?SEPA(?:\s+|$)/iu, "direct-debit"],
  [/^PRELEVEMENT(?:\s+SEPA)?(?:\s+|$)/iu, "direct-debit"],
  [/^RETRAIT\s+DAB(?:\s+|$)/iu, "atm"],
  [/^RETRAIT(?:\s+|$)/iu, "atm"],
  [/^VIR(?:EMENT)?(?:\s+(?:SEPA|INST))?(?:\s+|$)/iu, "transfer"],
  [/^ACHAT\s+CB(?:\s+|$)/iu, "card"],
  [/^CARTE(?:\s+|$)/iu, "card"],
  [/^CB(?:\s+|$)/iu, "card"],
  [/^(?:CHEQUE|CHQ)(?:\s+|$)/iu, "cheque"],
  [/^ECH\s+PRET\s*:?\s*/iu, "loan"],
  [/^(?:FRAIS|COTISATION|COMMISSION)(?:\s+|$)/iu, "fee"],
];

/** Trailing date, card or reference chunks that are not payee identity. */
const TRAILING_NOISE =
  /\s+(?:CARTE\s+\d{4,}|CB\*?\d{4,}|\d{2}[./]\d{2}(?:[./]\d{2,4})?)$/iu;

/** Reference suffixes like REF: ..., MDT/..., ECH/..., ID ... */
const REF_SUFFIX = /\s+(?:REF\s*:\s*\S+|MDT\/\S+|ECH\/\S+|ID\s+\S+)$/iu;

// ── Shared types for institution parsers ─────────────────────────────────

export interface VerbPrefixResult {
  text: string;
  channel: TransactionChannel;
}

/** A regex-to-channel rule used by matchPatterns. */
export interface PatternRule {
  readonly re: RegExp;
  readonly channel: TransactionChannel;
  readonly dateParser?: (raw: string) => string | undefined;
  /** Override default payee extraction from capture(groups, "payee"). */
  readonly extractPayee?: (
    groups: Record<string, string>
  ) => string | undefined;
}

/** Result of a successful line match. */
export interface LineMatch {
  payee: string;
  channel: TransactionChannel;
  cardLast4?: string;
  labelDate?: string;
}

// ── Shared helpers ───────────────────────────────────────────────────────

/**
 * Strip the channel-verb prefix from a line, returning the remaining text
 * and the detected channel. When no verb matches, returns the line unchanged
 * with channel "unknown".
 */
export const stripVerbPrefix = (line: string): VerbPrefixResult => {
  for (const [re, channel] of CHANNEL_VERB_PATTERNS) {
    const m = re.exec(line);
    if (m) {
      return { channel, text: line.slice(m[0].length).trim() };
    }
  }
  return { channel: "unknown", text: line };
};

/** Strip trailing date, card and reference noise that is not payee identity. */
export const cleanTrailingNoise = (text: string): string =>
  text.replace(REF_SUFFIX, "").replace(TRAILING_NOISE, "").trim();

/**
 * Read a named capture group, returning the trimmed value or undefined when
 * the group is absent or blank. Under noUncheckedIndexedAccess, named groups
 * are string | undefined — this helper narrows that in one place.
 */
export const capture = (
  groups: Record<string, string>,
  name: string
): string | undefined => {
  const v = groups[name]?.trim();
  return v && v.length > 0 ? v : undefined;
};

/**
 * Try each pattern rule against a line in order, returning the first
 * successful extraction or null. Moves the branching complexity out of
 * each parser's parse() method.
 */
export const matchPatterns = (
  line: string,
  rules: readonly PatternRule[]
): LineMatch | null => {
  for (const rule of rules) {
    const m = rule.re.exec(line);
    if (!m?.groups) {
      continue;
    }

    const payee = rule.extractPayee
      ? rule.extractPayee(m.groups)
      : capture(m.groups, "payee");
    if (!payee) {
      continue;
    }

    const date = capture(m.groups, "date");

    return {
      cardLast4: capture(m.groups, "card"),
      channel: rule.channel,
      labelDate: date && rule.dateParser ? rule.dateParser(date) : undefined,
      payee,
    };
  }
  return null;
};

// ── Generic fallback parser ──────────────────────────────────────────────

/**
 * Generic fallback parser — no institution-specific knowledge.
 *
 * Strategy: try channel-prefix stripping on every line, pick the longest
 * remaining text, then fall back to creditorName / debtorName.
 */
export const generic: InstitutionParser = {
  id: "generic",

  matches: () => true,

  parse(input: DescriptorParseInput): DescriptorParseResult {
    const droppedLines: string[] = [];
    let bestPayee = "";
    let bestChannel: TransactionChannel = "unknown";

    for (const raw of input.remittanceLines) {
      const line = raw.trim();
      if (line.length === 0) {
        continue;
      }

      const { channel, text } = stripVerbPrefix(line);
      const cleaned = cleanTrailingNoise(text);

      if (cleaned.length === 0) {
        // Line was pure verb prefix or noise — still capture the channel
        if (channel !== "unknown" && bestChannel === "unknown") {
          bestChannel = channel;
        }
        droppedLines.push(line);
        continue;
      }

      // Prefer the line that yields the most merchant identity after cleaning.
      if (cleaned.length > bestPayee.length) {
        bestPayee = cleaned;
        if (channel !== "unknown") {
          bestChannel = channel;
        }
      }
      // Even if a shorter line, capture its channel when we have none.
      if (bestChannel === "unknown" && channel !== "unknown") {
        bestChannel = channel;
      }
    }

    // Fall back to counterparty names when no label yielded usable text.
    if (bestPayee.length === 0) {
      bestPayee = (input.creditorName ?? input.debtorName ?? "")?.trim() ?? "";
    }

    const payeeText = bestPayee.length > 0 ? bestPayee : null;

    return {
      channel: bestChannel,
      droppedLines,
      normalisedDescriptor: payeeText ? normaliseDescriptor(payeeText) : "",
      parserId: "generic",
      payeeText,
    };
  },
};
