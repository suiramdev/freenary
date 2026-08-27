import type { SpendingCategory } from "../../lib/mcc-categories";

/**
 * Result from a country-specific business-registry lookup.
 *
 * Each country's register returns different identifiers (SIREN, HRB,
 * KvK number, ...) and activity codes (NAF, WZ, SBI, ...). The
 * generic fields normalise what the cascade needs; adapter-specific
 * detail stays in the adapter.
 */
export interface BusinessRegistryResult {
  /** Mapped spending category. */
  category: SpendingCategory;
  /** Legal business name from the register. */
  denomination: string;
  /** Country-specific activity/industry code (e.g. NAF "47.11B", WZ "47.11"). */
  activityCode: string;
  /** Country-specific legal-entity identifier (e.g. SIREN "123456789"). */
  registryId: string;
  /** Trade name / enseigne when available. */
  tradeName: string | null;
}

/**
 * A country-specific business-registry adapter.
 *
 * Each country that has a publicly queryable business register (France:
 * SIRENE, Germany: Handelsregister, Netherlands: KvK, ...) implements
 * this interface. Countries without a register simply have no adapter,
 * and the cascade skips the stage.
 */
export interface BusinessRegistryAdapter {
  /** ISO 3166-1 alpha-2 country code this adapter serves. */
  readonly country: string;
  /**
   * Look up a creditor name in the country's business register.
   * Returns null on network error, no results, or unmappable activity code.
   * Must never throw.
   */
  lookup: (
    creditorName: string,
    allowExternalLookup: boolean
  ) => Promise<BusinessRegistryResult | null>;
}
