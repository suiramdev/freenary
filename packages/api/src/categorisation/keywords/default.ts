import type { SpendingCategory } from "../../lib/taxonomy";
import { wholeTokenPattern } from "./anchor";

export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [wholeTokenPattern("lön(?:er|en)?|salar(?:y|ies)|wages?"), "salary"],
  [wholeTokenPattern("hyra|hyran|rents?|mortgages?"), "rent-mortgage"],
  [wholeTokenPattern("skatt\\p{L}*|tax(?:e|es)?"), "taxes"],
];

export const merchantQualifiers: readonly string[] = [
  "internet",
  "mobile",
  "telecom",
];
