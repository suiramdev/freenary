import { detectIntermediary } from "./intermediaries/detect";
import { normaliseTokens } from "./normalise/normalise-descriptor";
import { parseDescriptor } from "./normalise/parse-descriptor";
import type { DescriptorParseInput } from "./normalise/types";
import { isPlaceToken } from "./place-tokens";
import type { MerchantKeyInput, MerchantKeyResult } from "./types";

/**
 * Family codes that route to the IBAN path when a creditor IBAN is present.
 * RCDT = received credit transfer, RDDT = received direct debit,
 * ICDT = issued credit transfer, PMNT = payment.
 */
const IBAN_FAMILY_CODES = {
  ICDT: true,
  PMNT: true,
  RCDT: true,
  RDDT: true,
} as const satisfies Record<string, true>;

const CARD_MARKERS = /\b(?:CARTE|CB|CARD|CONTACTLESS)\b/iu;
const hasEarlyAsterisk = (text: string): boolean =>
  text.includes("*") && text.indexOf("*") < 15;

const looksLikeCardDescriptor = (raw: string): boolean =>
  CARD_MARKERS.test(raw) || hasEarlyAsterisk(raw);

/**
 * Strip trailing place-name tokens from a normalised token array
 * so that city-suffixed descriptors converge to the merchant name.
 */
const stripTrailingPlaces = (tokens: string[]): string[] => {
  let end = tokens.length;
  while (end > 1 && isPlaceToken(tokens[end - 1] ?? "")) {
    end -= 1;
  }
  return end === tokens.length ? tokens : tokens.slice(0, end);
};

/**
 * IBAN path: a creditor IBAN plus either a transfer family code, or no family
 * code at all on a descriptor that does not look like a card transaction.
 */
const usesIbanPath = (
  iban: string | null | undefined,
  familyCode: string | null | undefined,
  rawDescriptor: string
): iban is string => {
  if (iban === null || iban === undefined || iban.trim().length === 0) {
    return false;
  }
  if (familyCode === null || familyCode === undefined) {
    return !looksLikeCardDescriptor(rawDescriptor);
  }
  // SAFETY: a plain membership test on a closed const table — a non-member code
  // reads undefined, which fails the === true comparison.
  return (
    IBAN_FAMILY_CODES[familyCode as keyof typeof IBAN_FAMILY_CODES] === true
  );
};

const FALLBACK_RESULT: MerchantKeyResult = {
  channel: "unknown",
  intermediaryName: null,
  merchantKey: "",
  normalisedDescriptor: "",
  path: "card",
  payeeText: null,
};

/**
 * Derive the merchant lookup key for a single transaction.
 *
 * IBAN-path transactions use the creditor IBAN directly; card-path
 * transactions use the normalised descriptor (or the sub-merchant
 * text when a payment intermediary is detected). Never throws.
 */
export const deriveMerchantKey = (
  input: MerchantKeyInput
): MerchantKeyResult => {
  try {
    const {
      remittanceLines,
      creditorName,
      debtorName,
      creditorIban,
      bankTransactionFamilyCode,
      bankTransactionSubCode,
      amountMinor,
      institutionName,
      institutionBic,
      institutionGroup,
      country,
      creditorIdentifications,
    } = input;

    const rawDescriptor = remittanceLines.join(" ");

    const parseInput: DescriptorParseInput = {
      amountMinor,
      bankTransactionFamilyCode,
      bankTransactionSubCode,
      country,
      creditorName,
      debtorName,
      institutionBic,
      institutionGroup,
      institutionName,
      remittanceLines,
    };

    const parsed = parseDescriptor(parseInput);

    const intermediary = detectIntermediary({
      creditorIban,
      creditorIdentifications,
      normalisedDescriptor: parsed.normalisedDescriptor,
      rawDescriptor,
    });

    if (usesIbanPath(creditorIban, bankTransactionFamilyCode, rawDescriptor)) {
      return {
        channel: parsed.channel,
        intermediaryName: intermediary?.intermediaryName ?? null,
        merchantKey: creditorIban.trim().toUpperCase(),
        normalisedDescriptor: parsed.normalisedDescriptor,
        path: "iban",
        payeeText: parsed.payeeText,
      };
    }

    // --- Card path ---
    const baseTokens =
      intermediary?.submerchantText === null ||
      intermediary?.submerchantText === undefined
        ? normaliseTokens(parsed.payeeText ?? "")
        : normaliseTokens(intermediary.submerchantText);
    const merchantKey = stripTrailingPlaces(baseTokens).join(" ");

    return {
      channel: parsed.channel,
      intermediaryName: intermediary?.intermediaryName ?? null,
      merchantKey,
      normalisedDescriptor: parsed.normalisedDescriptor,
      path: "card",
      payeeText: parsed.payeeText,
    };
  } catch {
    return { ...FALLBACK_RESULT };
  }
};
