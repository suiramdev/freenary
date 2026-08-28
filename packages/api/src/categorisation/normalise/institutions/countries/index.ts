import type { TransactionChannel } from "../../types";
import {
  SUPPORTED_COUNTRIES,
  type SupportedCountry,
} from "../../../supported-countries";
import type { InstitutionDef } from "../definitions";
import { fr } from "./fr";
import type { CountryProfile } from "./types";

export type { CountryProfile } from "./types";

/**
 * Registry of country profiles keyed by country code.
 * Must stay in sync with SUPPORTED_COUNTRIES — the type-level check
 * below enforces this at compile time.
 */
const registry: Record<SupportedCountry, CountryProfile> = {
  FR: fr,
} satisfies Record<SupportedCountry, CountryProfile>;

/**
 * All registered country profiles, ordered by SUPPORTED_COUNTRIES.
 */
const profiles: readonly CountryProfile[] = SUPPORTED_COUNTRIES.map(
  (code) => registry[code]
);

/** Combined institution definitions across all countries. */
export const allInstitutions: readonly InstitutionDef[] = profiles.flatMap(
  (p) => p.institutions
);

/** Combined verb patterns across all countries, deduplicated by reference. */
export const allVerbPatterns: readonly [RegExp, TransactionChannel][] =
  profiles.flatMap((p) => p.verbPatterns);

/** Combined trailing-noise regexes across all countries. */
export const allTrailingNoise: readonly RegExp[] = profiles.flatMap(
  (p) => p.trailingNoise
);
