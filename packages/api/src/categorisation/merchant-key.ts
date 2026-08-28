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

    // --- Path determination ---
    const isIbanPath =
      creditorIban !== null &&
      creditorIban !== undefined &&
      creditorIban.trim().length > 0 &&
      bankTransactionFamilyCode !== null &&
      bankTransactionFamilyCode !== undefined &&
      // SAFETY: bankTransactionFamilyCode is null-checked above; assertion narrows for const lookup
      IBAN_FAMILY_CODES[
        bankTransactionFamilyCode as keyof typeof IBAN_FAMILY_CODES
      ] === true;

    // Fallback: IBAN path when family code is absent but creditor IBAN is present
    // and the descriptor doesn't look like a card transaction.
    const isIbanFallback =
      !isIbanPath &&
      creditorIban !== null &&
      creditorIban !== undefined &&
      creditorIban.trim().length > 0 &&
      (bankTransactionFamilyCode === null ||
        bankTransactionFamilyCode === undefined) &&
      !looksLikeCardDescriptor(rawDescriptor);

    if (isIbanPath || isIbanFallback) {
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
