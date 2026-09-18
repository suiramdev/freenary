import type { SpendingCategory } from "../../lib/taxonomy";
import { wholeTokenPattern } from "./anchor";

export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [wholeTokenPattern("lön(?:er|en)?|salar(?:y|ies)|wages?"), "salary"],
  [wholeTokenPattern("hyra|hyran|rents?"), "rent"],
  [wholeTokenPattern("mortgages?"), "mortgage"],
  [wholeTokenPattern("försäkring(?:ar|en)?|insurances?"), "other-insurance"],
  [wholeTokenPattern("skatt\\p{L}*|tax(?:e|es)?"), "other-taxes"],
  [
    wholeTokenPattern(
      "överföring(?:ar|en)?|transfers?|utlandsbetalning(?:ar|en)?|foreign"
    ),
    "other-transfer",
  ],
];

export const merchantQualifiers: readonly string[] = [
  "internet",
  "mobile",
  "telecom",
];

export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [wholeTokenPattern("uber|lyft|bolt|taxis?|cabify"), "taxi"],
  [wholeTokenPattern("netflix|spotify|disney|hbo|youtube"), "streaming"],
  [wholeTokenPattern("apple\\.com|google play"), "software"],
  [wholeTokenPattern("amazon|ebay"), "other-shopping"],
  [wholeTokenPattern("zalando|asos|h&m|zara"), "clothing"],
  [wholeTokenPattern("mcdonalds?|burger king|subway|dominos?"), "takeaway"],
  [wholeTokenPattern("starbucks"), "bars-cafes"],
  [
    wholeTokenPattern(
      "lidl|aldi|ica|coop|carrefour|tesco|walmart|target|albert heijn|migros"
    ),
    "groceries",
  ],
  [wholeTokenPattern("booking\\.com|airbnb|expedia"), "accommodation"],
  [wholeTokenPattern("ryanair|easyjet|klm|lufthansa"), "flights"],
  [wholeTokenPattern("apotek(?:et)?|pharmacy|apotheke"), "pharmacy"],
];
