export const SUPPORTED_COUNTRIES = ["FR"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];
