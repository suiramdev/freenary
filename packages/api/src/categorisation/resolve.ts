import { Option } from "effect";

import type { SpendingCategory } from "../lib/taxonomy";
import { deterministicCategory } from "./deterministic";
import {
  loadDictionary,
  lookupDictionary,
  unloadDictionary,
} from "./dictionary";
import { keywordsFor } from "./keywords";
import {
  loadModel,
  MODEL_ACCEPT_THRESHOLD,
  predict,
  unloadModel,
} from "./model";
import type { TransactionChannel } from "./normalise/types";
import type {
  CategoriseInput,
  DictionaryEntry,
  Iso3166Alpha2Country,
  ResolutionResult,
} from "./types";
import { lookupUserOverride } from "./user-override";

const CHANNEL_CATEGORY = {
  atm: "cash-withdrawal",
  cheque: "uncategorised",
  fee: "bank-fees",
} as const satisfies Partial<Record<TransactionChannel, SpendingCategory>>;

const UNKNOWN_RESULT: ResolutionResult = {
  band: "unknown",
  category: null,
  confidence: 0,
  intermediaryName: null,
  merchantName: null,
  stage: "none",
};

const CHANNEL_CONFIDENCE = 0.9;
const USER_OVERRIDE_CONFIDENCE = 1;
const DICTIONARY_CONFIDENCE = 0.85;
const AUTO_BAND_MIN_CONFIDENCE = 0.85;

const MIN_BRAND_KEY_LENGTH = 3;

export const merchantKeyCandidates = (
  merchantKey: string,
  country: Iso3166Alpha2Country | null | undefined
): string[] => {
  const candidates = [merchantKey];
  const { merchantQualifiers } = keywordsFor(country);
  const parts = merchantKey.split(" ");

  for (let end = parts.length - 1; end >= 1; end -= 1) {
    const tail = parts[end];

    if (!(tail && merchantQualifiers.has(tail))) {
      break;
    }

    const candidate = parts.slice(0, end).join(" ");

    if (candidate.length < MIN_BRAND_KEY_LENGTH) {
      break;
    }

    candidates.push(candidate);
  }

  return candidates;
};

const lookupMerchant = async (
  merchantKey: string,
  country: Iso3166Alpha2Country | null | undefined
): Promise<DictionaryEntry | null> => {
  for (const candidate of merchantKeyCandidates(merchantKey, country)) {
    // eslint-disable-next-line no-await-in-loop -- ordered, exits on first hit
    const hit = await lookupDictionary(candidate);

    if (hit) {
      return hit;
    }
  }

  return null;
};

const hasChannelCategory = (
  channel: TransactionChannel
): channel is keyof typeof CHANNEL_CATEGORY =>
  Object.hasOwn(CHANNEL_CATEGORY, channel);

const fromChannel = (input: CategoriseInput): ResolutionResult | null => {
  if (!hasChannelCategory(input.channel)) {
    return null;
  }

  const channelCategory = CHANNEL_CATEGORY[input.channel];

  return {
    band: "auto",
    category: channelCategory,
    confidence: CHANNEL_CONFIDENCE,
    intermediaryName: null,
    merchantName: null,
    stage: "channel",
  };
};

const fromUserOverride = async (
  input: CategoriseInput
): Promise<ResolutionResult | null> => {
  const override = await lookupUserOverride(input.userId, input.merchantKey);

  if (!override) {
    return null;
  }

  return {
    band: "auto",
    category: override.category,
    confidence: USER_OVERRIDE_CONFIDENCE,
    intermediaryName: null,
    merchantName: override.merchantName,
    stage: "user-override",
  };
};

const fromDictionary = async (
  input: CategoriseInput
): Promise<ResolutionResult | null> => {
  const entry = await lookupMerchant(input.merchantKey, input.country);

  if (!entry) {
    return null;
  }

  return {
    band: "auto",
    category: entry.category,
    confidence: DICTIONARY_CONFIDENCE,
    intermediaryName: null,
    merchantName: entry.name,
    stage: "dictionary",
  };
};

const fromDeterministicRules = (
  input: CategoriseInput
): ResolutionResult | null => {
  const deterministic = deterministicCategory(input);

  if (!deterministic) {
    return null;
  }

  return {
    band: "auto",
    category: deterministic.category,
    confidence: deterministic.confidence,
    intermediaryName: null,
    merchantName: null,
    stage: deterministic.stage,
  };
};

const fromLocalClassifier = async (
  input: CategoriseInput
): Promise<ResolutionResult | null> => {
  const prediction = await predict(input.normalisedDescriptor, input.country);

  if (!prediction || prediction.confidence < MODEL_ACCEPT_THRESHOLD) {
    return null;
  }

  return {
    band:
      prediction.confidence >= AUTO_BAND_MIN_CONFIDENCE ? "auto" : "suggest",
    category: prediction.category,
    confidence: prediction.confidence,
    intermediaryName: null,
    merchantName: null,
    stage: "model",
  };
};

const categoriseInternal = async (
  input: CategoriseInput
): Promise<ResolutionResult> => {
  const byChannel = fromChannel(input);

  if (byChannel) {
    return byChannel;
  }

  if (input.merchantKey.length > 0) {
    const byOverride = await fromUserOverride(input);

    if (byOverride) {
      return byOverride;
    }

    const byDictionary = await fromDictionary(input);

    if (byDictionary) {
      return byDictionary;
    }
  }

  const byRules = fromDeterministicRules(input);

  if (byRules) {
    return byRules;
  }

  return (await fromLocalClassifier(input)) ?? UNKNOWN_RESULT;
};

export const categoriseTransaction = async (
  input: CategoriseInput
): Promise<ResolutionResult> =>
  Option.getOrElse(
    await categoriseInternal(input).then(Option.some, Option.none),
    () => UNKNOWN_RESULT
  );

const categoriseInOrder = async (
  transactions: CategoriseInput[]
): Promise<ResolutionResult[]> => {
  const results: ResolutionResult[] = [];

  for (const tx of transactions) {
    // eslint-disable-next-line no-await-in-loop -- sequential: each lookup may hit the DB for user overrides
    results.push(await categoriseTransaction(tx));
  }

  return results;
};

const releaseBatchResources = (): void => {
  unloadDictionary();
  unloadModel();
};

export const categoriseBatch = async (
  transactions: CategoriseInput[],
  countries: Iso3166Alpha2Country[] | undefined
): Promise<ResolutionResult[]> => {
  if (transactions.length === 0) {
    return [];
  }

  await Promise.all([loadDictionary(countries), loadModel()]);

  return await categoriseInOrder(transactions).finally(releaseBatchResources);
};
