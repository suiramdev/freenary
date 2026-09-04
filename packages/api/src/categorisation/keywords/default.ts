/**
 * Country-agnostic keyword heuristics — the default layer under every
 * country file. International brands and English/Nordic scheme words that
 * hold wherever the transaction was booked.
 *
 * Every pattern is token-anchored through `tokens()` and spells out the
 * inflected forms banks actually write, since the anchors rule out the
 * substring matching the tables relied on before.
 *
 * Like the country files, this module imports nothing from the
 * normalise/institution chain: that chain reaches mcc-categories.ts, which
 * consumes these tables.
 */

import type { SpendingCategory } from "../../lib/taxonomy";
import { tokens } from "./anchor";

/** Bank-transaction-code keywords. */
export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [tokens("lön(?:er|en)?|salar(?:y|ies)|wages?"), "salary"],
  [tokens("hyra|hyran|rents?"), "rent"],
  [tokens("mortgages?"), "mortgage"],
  [tokens("försäkring(?:ar|en)?|insurances?"), "other-insurance"],
  [tokens("skatt\\p{L}*|tax(?:e|es)?"), "other-taxes"],
  [
    tokens(
      "överföring(?:ar|en)?|transfers?|utlandsbetalning(?:ar|en)?|foreign"
    ),
    "other-transfer",
  ],
];

/**
 * Service words banks append after a brand ("free mobile"). They are stripped
 * from the tail of a merchant key that missed the dictionary, never from the
 * middle: "t mobile" is the brand, "mobile" alone is not.
 */
export const merchantQualifiers: readonly string[] = [
  "internet",
  "mobile",
  "telecom",
];

/** Counterparty-name keywords. */
export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [tokens("uber|lyft|bolt|taxis?|cabify"), "taxi"],
  [tokens("netflix|spotify|disney|hbo|youtube"), "streaming"],
  [tokens("apple\\.com|google play"), "software"],
  [tokens("amazon|ebay"), "other-shopping"],
  [tokens("zalando|asos|h&m|zara"), "clothing"],
  [tokens("mcdonalds?|burger king|subway|dominos?"), "takeaway"],
  [tokens("starbucks"), "bars-cafes"],
  [
    tokens(
      "lidl|aldi|ica|coop|carrefour|tesco|walmart|target|albert heijn|migros"
    ),
    "groceries",
  ],
  [tokens("booking\\.com|airbnb|expedia"), "accommodation"],
  // "sas" is left out: the airline collides with the French company form,
  // which appears in a large share of French merchant labels.
  [tokens("ryanair|easyjet|klm|lufthansa"), "flights"],
  [tokens("apotek(?:et)?|pharmacy|apotheke"), "pharmacy"],
];
