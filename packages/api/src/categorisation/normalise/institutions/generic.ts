import { normaliseDescriptor } from "../normalise-descriptor";
import type {
  DescriptorParseInput,
  DescriptorParseResult,
  InstitutionParser,
  TransactionChannel,
} from "../types";
import { capture } from "./capture-groups";
import {
  allInstitutions,
  allTrailingNoise,
  allVerbPatterns,
} from "./countries";
import type { InstitutionDef } from "./definitions";
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
  for (const [re, channel] of allVerbPatterns) {
    if (re.test(line)) {
      return { channel, text: line.replace(re, "").trim() };
    }
  }
  return { channel: "unknown", text: line };
};

/** Strip trailing noise that is not payee identity. */
export const cleanTrailingNoise = (text: string): string => {
  let result = text;
  for (const re of allTrailingNoise) {
    result = result.replace(re, "");
  }
  return result.trim();
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
    const groups = rule.re.exec(line)?.groups;
    if (!groups) {
      continue;
    }

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

/** Check if an input matches an institution definition by BIC, name, or group. */
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
  if (input.institutionGroup && def.groups) {
    const groupLower = foldAccents(input.institutionGroup);
    for (const group of def.groups) {
      if (groupLower.includes(foldAccents(group))) {
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

type PayeeCleaner = (text: string) => string;

const keepPayee: PayeeCleaner = (text) => text;

/** Mutable accumulator threaded through the remittance-line loop. */
interface ParseState {
  payee: string | null;
  channel: TransactionChannel;
  cardLast4: string | undefined;
  labelDate: string | undefined;
  droppedLines: string[];
}

/** Blank lines and institution-declared noise never reach payee extraction. */
const isDroppedLine = (line: string, def: InstitutionDef | null): boolean =>
  line.length === 0 || (def?.noiseLines?.some((re) => re.test(line)) ?? false);

/** An institution pattern hit is authoritative: it replaces the payee. */
const applyPatternMatch = (
  state: ParseState,
  match: LineMatch,
  clean: PayeeCleaner
): void => {
  const { cardLast4, channel, labelDate, payee } = match;
  state.payee = clean(payee);
  if (state.channel === "unknown" && channel !== "unknown") {
    state.channel = channel;
  }
  state.cardLast4 = cardLast4;
  state.labelDate = labelDate;
};

/** A recognised channel verb yields the payee only if none was found yet. */
const applyVerbLine = (
  state: ParseState,
  line: string,
  verbChannel: TransactionChannel,
  cleaned: string
): void => {
  if (state.channel === "unknown") {
    state.channel = verbChannel;
  }
  if (cleaned.length > 0 && !state.payee) {
    state.payee = cleaned;
  } else {
    state.droppedLines.push(line);
  }
};

const consumeLine = (
  state: ParseState,
  line: string,
  def: InstitutionDef | null,
  clean: PayeeCleaner
): void => {
  if (def) {
    const match = matchPatterns(line, def.patterns);
    if (match) {
      applyPatternMatch(state, match, clean);
      return;
    }
  }

  const { channel: verbChannel, text: stripped } = stripVerbPrefix(line);
  if (verbChannel !== "unknown") {
    applyVerbLine(
      state,
      line,
      verbChannel,
      clean(cleanTrailingNoise(stripped))
    );
    return;
  }

  if (def) {
    // Institution parser: unknown lines after the payee are noise
    if (state.payee) {
      state.droppedLines.push(line);
    } else {
      state.payee = clean(line);
    }
    return;
  }

  // Generic parser: pick the longest cleaned line
  const cleaned = clean(cleanTrailingNoise(line));
  if (cleaned.length > (state.payee?.length ?? 0)) {
    state.payee = cleaned;
  }
};

/**
 * For direct debits the counterparty name IS the merchant; remittance text
 * describes the billing reason ("Loyer", "Internet fibre"), not the payee.
 * Also promotes the counterparty when no payee was extracted at all.
 */
const applyCounterparty = (
  state: ParseState,
  input: DescriptorParseInput
): void => {
  const incoming = input.amountMinor >= 0;
  const preferred = incoming ? input.debtorName : input.creditorName;
  const fallback = incoming ? input.creditorName : input.debtorName;

  if (state.channel === "direct-debit") {
    const name = preferred?.trim();
    if (name && name.length > 0) {
      state.payee = name;
    }
  }

  if (!state.payee || state.payee.length === 0) {
    state.payee = preferred?.trim() || fallback?.trim() || null;
  }
};

/**
 * Parse remittance lines using an optional institution definition.
 * When def is null, runs the generic fallback (verb detection only).
 */
const parseLines = (
  input: DescriptorParseInput,
  def: InstitutionDef | null
): DescriptorParseResult => {
  const state: ParseState = {
    cardLast4: undefined,
    // Primary channel signal: ISO 20022 family code from the provider
    channel:
      channelFromFamilyCode(input.bankTransactionFamilyCode) ?? "unknown",
    droppedLines: [],
    labelDate: undefined,
    payee: null,
  };
  const clean = def?.cleanPayee ?? keepPayee;

  for (const raw of input.remittanceLines.toSorted()) {
    const line = raw.trim();
    if (isDroppedLine(line, def)) {
      state.droppedLines.push(line);
      continue;
    }
    consumeLine(state, line, def, clean);
  }

  applyCounterparty(state, input);

  return {
    cardLast4: state.cardLast4,
    channel: state.channel,
    droppedLines: state.droppedLines,
    labelDate: state.labelDate,
    normalisedDescriptor: state.payee ? normaliseDescriptor(state.payee) : "",
    parserId: def?.id ?? "generic",
    payeeText: state.payee,
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
  allInstitutions.map(fromDef);

/** Generic fallback parser — no institution-specific knowledge. */
export const generic: InstitutionParser = {
  id: "generic",
  matches: () => true,
  parse: (input) => parseLines(input, null),
};
