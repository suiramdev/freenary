import type { PatternRule } from "./generic";

/**
 * A data-driven institution definition. All locale-specific knowledge —
 * BIC prefixes, name substrings, regex patterns, noise filters, and
 * payee cleanup — lives in the country profile that owns the institution.
 *
 * Adding a new institution = one object in the country's profile.
 */
export interface InstitutionDef {
  readonly id: string;
  /** BIC prefixes (6- or 8-char) that identify this institution. */
  readonly bics: readonly string[];
  /** Lowercase name substrings that identify this institution. */
  readonly names: readonly string[];
  /** Ordered pattern rules for structured extraction. */
  readonly patterns: readonly PatternRule[];
  /** Lines matching any of these regexes are dropped as noise before parsing. */
  readonly noiseLines?: readonly RegExp[];
  /** Post-extraction payee text cleanup (e.g. location stripping). */
  readonly cleanPayee?: (text: string) => string;
}
