import type { SpendingCategory } from "../../lib/taxonomy";
import { wholeTokenPattern } from "./anchor";

export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [wholeTokenPattern("loyers?|bail|baux"), "rent"],
  [wholeTokenPattern("salaires?|traitements?"), "salary"],
  [wholeTokenPattern("assurances?|mutuelles?"), "other-insurance"],
  [
    wholeTokenPattern(
      "imp[oô]ts?|pr[eé]l[eè]vement social|pr[eé]l[eè]vements sociaux"
    ),
    "other-taxes",
  ],
  [wholeTokenPattern("virements?"), "other-transfer"],
];

export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [wholeTokenPattern("sci|hlm|opac|bailleurs?"), "rent"],
  [wholeTokenPattern("pharmacies?"), "pharmacy"],
];

export const merchantQualifiers: readonly string[] = [
  "abonnement",
  "electricite",
  "energie",
  "energies",
  "fibre",
  "forfait",
  "france",
  "gaz",
];
