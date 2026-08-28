/**
 * Countries with full categorisation support.
 *
 * A country belongs here when it has keyword heuristics, institution
 * profiles, and (optionally) a per-country merchant dictionary file.
 * Adding a country = implement the modules, then add the code here.
 *
 * This is NOT the same as the geographic scope used for place-token
 * generation (generate-place-tokens.ts), which is intentionally broader
 * to normalise cross-border transaction descriptions.
 */
export const SUPPORTED_COUNTRIES = ["FR"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];
