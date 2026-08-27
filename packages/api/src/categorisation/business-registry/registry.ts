import { sireneAdapter } from "./adapters/sirene";
import type { BusinessRegistryAdapter } from "./types";

/**
 * Country → business-registry adapter map.
 *
 * Adding a new country's business register = one adapter file + one
 * entry here. Countries with no adapter simply skip the stage.
 */
const adapters = new Map<string, BusinessRegistryAdapter>([
  [sireneAdapter.country, sireneAdapter],
]);

/** Return the business-registry adapter for a country, or null when none exists. */
export const getBusinessRegistryAdapter = (
  country: string
): BusinessRegistryAdapter | null =>
  adapters.get(country.toUpperCase()) ?? null;
