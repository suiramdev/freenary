import { z } from "zod";

export const MAX_TAX_RESIDENCY_COUNTRIES = 10;

export const isoAlpha2CountryCode = z
  .string()
  .regex(/^[A-Z]{2}$/u, "Expected an ISO 3166-1 alpha-2 country code");

export const taxResidencyCountries = z
  .array(isoAlpha2CountryCode)
  .max(MAX_TAX_RESIDENCY_COUNTRIES);
