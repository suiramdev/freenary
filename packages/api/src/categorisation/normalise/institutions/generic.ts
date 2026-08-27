import { normaliseDescriptor } from "../normalise-descriptor";
import type {
  DescriptorParseInput,
  DescriptorParseResult,
  InstitutionParser,
  TransactionChannel,
} from "../types";
import type { InstitutionDef } from "./definitions";
import { institutionDefs } from "./definitions";
import { channelFromFamilyCode } from "./iso20022-channel";

// ── Shared types for pattern rules ───────────────────────────────────────

/** A regex-to-channel rule used by matchPatterns. */
export interface PatternRule {
  readonly channel: TransactionChannel;
  readonly re: RegExp;
  readonly dateParser?: (raw: string) => string | undefined;
  /** Override default payee extraction from the `payee` named group. */
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

// ── Channel-verb patterns (generic fallback) ─────────────────────────────

/**
 * Channel-verb patterns, ordered longest-first to avoid partial matches.
 *
 * These detect the channel from the leading verb of any French bank descriptor.
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

// ── Shared helpers ───────────────────────────────────────────────────────

export interface VerbPrefixResult {
  channel: TransactionChannel;
  text: string;
}

/**
 * Strip the channel-verb prefix from a line, returning the remaining text
 * and the detected channel. When no verb matches, returns the line unchanged
 * with channel "unknown".
 */
export const stripVerbPrefix = (line: string): VerbPrefixResult => {
  for (const [re, channel] of CHANNEL_VERB_PATTERNS) {
    if (re.test(line)) {
      return { channel, text: line.replace(re, "").trim() };
    }
  }
  return { channel: "unknown", text: line };
};

/** Strip trailing date, card and reference noise that is not payee identity. */
export const cleanTrailingNoise = (text: string): string =>
  text.replace(REF_SUFFIX, "").replace(TRAILING_NOISE, "").trim();

/**
 * Read a named capture group, returning the trimmed value or undefined when
 * the group is absent or blank.
 */
export const capture = (
  groups: Record<string, string>,
  name: string
): string | undefined => {
  const val = groups[name]?.trim();
  return val && val.length > 0 ? val : undefined;
};

/**
 * Try each pattern rule against a line in order, returning the first
 * successful extraction or null.
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

    const groups = m.groups as Record<string, string>;
    const payeeRaw = rule.extractPayee
      ? rule.extractPayee(groups)
      : capture(groups, "payee");

    if (!payeeRaw) {
      continue;
    }

    const payee = cleanTrailingNoise(payeeRaw);
    if (payee.length === 0) {
      continue;
    }

    const dateRaw = capture(groups, "date");
    const labelDate =
      dateRaw && rule.dateParser ? rule.dateParser(dateRaw) : undefined;

    return {
      cardLast4: capture(groups, "card"),
      channel: rule.channel,
      labelDate,
      payee,
    };
  }
  return null;
};

// ── Institution matching ─────────────────────────────────────────────────

const COMBINING_MARKS = /[\u0300-\u036F]/gu;

/** Normalise a string for accent-insensitive comparison. */
const foldAccents = (s: string): string =>
  s.normalize("NFD").replaceAll(COMBINING_MARKS, "").toLowerCase();

/** Check if an input matches an institution definition by BIC or name. */
const matchesDef = (
  input: DescriptorParseInput,
  def: InstitutionDef
): boolean => {
  if (input.institutionBic) {
    const upper = input.institutionBic.toUpperCase();
    for (const bic of def.bics) {
      if (upper.startsWith(bic)) {
        return true;
      }
    }
  }
  const lower = foldAccents(input.institutionName);
  for (const name of def.names) {
    if (lower.includes(foldAccents(name))) {
      return true;
    }
  }
  return false;
};

// ── Unified parse logic ──────────────────────────────────────────────────

/**
 * Parse remittance lines using an optional institution definition.
 * When def is null, runs the generic fallback (verb detection only).
 */
const parseLines = (
  input: DescriptorParseInput,
  def: InstitutionDef | null
): DescriptorParseResult => {
  const parserId = def?.id ?? "generic";
  const droppedLines: string[] = [];
  let payee: string | null = null;
  let channel: TransactionChannel = "unknown";
  let cardLast4: string | undefined;
  let labelDate: string | undefined;

  // Primary channel signal: ISO 20022 family code from the provider
  const structuredChannel = channelFromFamilyCode(
    input.bankTransactionFamilyCode
  );
  if (structuredChannel) {
    channel = structuredChannel;
  }

  const clean = def?.cleanPayee ?? ((t: string) => t);

  for (const raw of input.remittanceLines) {
    const line = raw.trim();
    if (line.length === 0) {
      droppedLines.push(line);
      continue;
    }

    // Drop institution-specific noise lines
    if (def?.noiseLines?.some((re) => re.test(line))) {
      droppedLines.push(line);
      continue;
    }

    // Try institution-specific patterns first
    if (def) {
      const match = matchPatterns(line, def.patterns);
      if (match) {
        payee = clean(match.payee);
        if (channel === "unknown" && match.channel !== "unknown") {
          channel = match.channel;
        }
        cardLast4 = match.cardLast4;
        labelDate = match.labelDate;
        continue;
      }
    }

    // Fall back to generic verb detection
    const { channel: verbChannel, text: stripped } = stripVerbPrefix(line);
    if (verbChannel !== "unknown") {
      if (channel === "unknown") {
        channel = verbChannel;
      }
      const cleaned = clean(cleanTrailingNoise(stripped));
      if (cleaned.length > 0 && !payee) {
        payee = cleaned;
      } else {
        droppedLines.push(line);
      }
    } else if (def) {
      // Institution parser: unknown lines after payee are noise
      if (payee) {
        droppedLines.push(line);
      } else {
        payee = clean(line);
      }
    } else {
      // Generic parser: pick the longest cleaned line
      const cleaned = clean(cleanTrailingNoise(line));
      if (cleaned.length > (payee?.length ?? 0)) {
        payee = cleaned;
      }
    }
  }

  // Promote creditorName/debtorName when regex extraction yielded nothing
  if (!payee || payee.length === 0) {
    const counterparty =
      (input.creditorName ?? input.debtorName ?? null)?.trim() ?? null;
    payee = counterparty && counterparty.length > 0 ? counterparty : null;
  }

  return {
    cardLast4,
    channel,
    droppedLines,
    labelDate,
    normalisedDescriptor: payee ? normaliseDescriptor(payee) : "",
    parserId,
    payeeText: payee,
  };
};

// ── Build parser array from definitions ──────────────────────────────────

/** Create an InstitutionParser from a data definition. */
const fromDef = (def: InstitutionDef): InstitutionParser => ({
  id: def.id,
  matches: (input) => matchesDef(input, def),
  parse: (input) => parseLines(input, def),
});

/**
 * Ordered list of institution-specific parsers built from definitions.
 * The generic parser is NOT in this list — it is the fallback.
 */
export const institutionParsers: readonly InstitutionParser[] =
  institutionDefs.map(fromDef);

/** Generic fallback parser — no institution-specific knowledge. */
export const generic: InstitutionParser = {
  id: "generic",
  matches: () => true,
  parse: (input) => parseLines(input, null),
};
