import type { TransactionChannel } from "../../types";
import type { InstitutionDef } from "../definitions";

/**
 * A country profile bundles the locale-specific knowledge the parse
 * engine needs: institution definitions, channel-verb patterns for
 * generic fallback, and trailing-noise cleanup regexes.
 *
 * Adding a new country = one new file exporting a CountryProfile.
 */
export interface CountryProfile {
  /** ISO 3166-1 alpha-2 country code. */
  readonly code: string;
  /** Institution definitions for banks in this country. */
  readonly institutions: readonly InstitutionDef[];
  /**
   * Channel-verb patterns for the generic (non-institution-specific)
   * fallback parser. Ordered longest-first to avoid partial matches.
   */
  readonly verbPatterns: readonly [RegExp, TransactionChannel][];
  /**
   * Trailing noise regexes stripped from payee text.
   * Applied in order via String.replace.
   */
  readonly trailingNoise: readonly RegExp[];
}
