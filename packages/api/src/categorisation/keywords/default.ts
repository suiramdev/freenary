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
