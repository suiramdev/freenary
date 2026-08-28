import type { TransactionChannel } from "../types";
import type { InstitutionDef } from "./definitions";

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

export interface VerbPrefixResult {
  channel: TransactionChannel;
  text: string;
}

// ── Shared helpers ───────────────────────────────────────────────────────

const COMBINING_MARKS = /[\u0300-\u036F]/gu;

/** Normalise a string for accent-insensitive comparison. */
const foldAccents = (s: string): string =>
  s.normalize("NFD").replaceAll(COMBINING_MARKS, "").toLowerCase();

/** Check if an input matches an institution definition by BIC or name. */
export const matchesDef = (
  input: { institutionBic?: string; institutionName: string },
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

/**
 * Strip the channel-verb prefix from a line, returning the remaining text
 * and the detected channel. When no verb matches, returns the line unchanged
 * with channel "unknown".
 */
export const stripVerbPrefix = (
  line: string,
  allVerbPatterns: readonly [RegExp, TransactionChannel][]
): VerbPrefixResult => {
  for (const [re, channel] of allVerbPatterns) {
    if (re.test(line)) {
      return { channel, text: line.replace(re, "").trim() };
    }
  }
  return { channel: "unknown", text: line };
};

/** Strip trailing noise that is not payee identity. */
export const cleanTrailingNoise = (
  text: string,
  allTrailingNoise: readonly RegExp[]
): string => {
  let result = text;
  for (const re of allTrailingNoise) {
    result = result.replace(re, "");
  }
  return result.trim();
};

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

    // SAFETY: the rule's regex uses named groups; a match always carries them
    const groups = m.groups as Record<string, string>;
    const payeeRaw = rule.extractPayee
      ? rule.extractPayee(groups)
      : capture(groups, "payee");

    if (!payeeRaw) {
      continue;
    }

    const dateRaw = capture(groups, "date");
    const labelDate =
      dateRaw && rule.dateParser ? rule.dateParser(dateRaw) : undefined;

    return {
      cardLast4: capture(groups, "card"),
      channel: rule.channel,
      labelDate,
      payee: cleanTrailingNoise(payeeRaw, []),
    };
  }
  return null;
};
