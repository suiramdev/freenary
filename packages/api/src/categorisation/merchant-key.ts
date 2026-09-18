import { Option } from "effect";

import { detectIntermediary } from "./intermediaries/detect";
import { normaliseTokens } from "./normalise/normalise-descriptor";
import { parseDescriptor } from "./normalise/parse-descriptor";
import type { DescriptorParseInput } from "./normalise/types";
import { isPlaceToken } from "./place-tokens";
import type {
  Iso20022FamilyCode,
  MerchantKeyInput,
  MerchantKeyResult,
} from "./types";

const IBAN_FAMILY_CODES = {
  ICDT: true,
  PMNT: true,
  RCDT: true,
  RDDT: true,
} as const satisfies Record<Iso20022FamilyCode, true>;

const CARD_MARKERS = /\b(?:CARTE|CB|CARD|CONTACTLESS)\b/iu;

const CARD_PREFIX_LENGTH = 15;

const FALLBACK_RESULT: MerchantKeyResult = {
  channel: "unknown",
  intermediaryName: null,
  merchantKey: "",
  normalisedDescriptor: "",
  path: "card",
  payeeText: null,
};

const looksLikeCardDescriptor = (raw: string): boolean => {
  const asteriskAt = raw.indexOf("*");

  return (
    CARD_MARKERS.test(raw) ||
    (asteriskAt !== -1 && asteriskAt < CARD_PREFIX_LENGTH)
  );
};

const withoutTrailingPlaces = (tokens: string[]): string[] => {
  let end = tokens.length;

  while (end > 1 && isPlaceToken(tokens[end - 1] ?? "")) {
    end -= 1;
  }

  return end === tokens.length ? tokens : tokens.slice(0, end);
};

const usesIbanPath = (
  iban: string | null | undefined,
  familyCode: Iso20022FamilyCode | null | undefined,
  rawDescriptor: string
): iban is string => {
  if (iban === null || iban === undefined || iban.trim().length === 0) {
    return false;
  }

  if (familyCode === null || familyCode === undefined) {
    return !looksLikeCardDescriptor(rawDescriptor);
  }

  return Object.hasOwn(IBAN_FAMILY_CODES, familyCode);
};

const merchantKeyOf = (input: MerchantKeyInput): MerchantKeyResult => {
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

  const cardPathTokens =
    intermediary?.submerchantText === null ||
    intermediary?.submerchantText === undefined
      ? normaliseTokens(parsed.payeeText ?? "")
      : normaliseTokens(intermediary.submerchantText);

  return {
    channel: parsed.channel,
    intermediaryName: intermediary?.intermediaryName ?? null,
    merchantKey: withoutTrailingPlaces(cardPathTokens).join(" "),
    normalisedDescriptor: parsed.normalisedDescriptor,
    path: "card",
    payeeText: parsed.payeeText,
  };
};

const merchantKeyOrNone = Option.liftThrowable(merchantKeyOf);

export const deriveMerchantKey = (input: MerchantKeyInput): MerchantKeyResult =>
  Option.getOrElse(merchantKeyOrNone(input), () => ({ ...FALLBACK_RESULT }));
