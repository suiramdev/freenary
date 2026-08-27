import type { TransactionChannel } from "../../types";
import type { InstitutionDef } from "../definitions";
import { fr } from "./fr";
import type { CountryProfile } from "./types";

export type { CountryProfile } from "./types";

/**
 * All registered country profiles.
 * Adding a country = one new file + one entry here.
 */
const profiles: readonly CountryProfile[] = [fr];

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
