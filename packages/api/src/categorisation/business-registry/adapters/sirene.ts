import { lookupSirene } from "../../sirene/lookup";
import type { BusinessRegistryAdapter, BusinessRegistryResult } from "../types";

/**
 * France: SIRENE adapter.
 *
 * Delegates to the existing `lookupSirene` function, which queries the
 * recherche-entreprises.api.gouv.fr API and maps NAF codes to spending
 * categories. The adapter wraps the SIRENE-specific result shape into
 * the generic `BusinessRegistryResult`.
 */
export const sireneAdapter: BusinessRegistryAdapter = {
  country: "FR",
  lookup: async (
    creditorName: string,
    allowExternalLookup: boolean
  ): Promise<BusinessRegistryResult | null> => {
    const result = await lookupSirene(creditorName, allowExternalLookup);
    if (!result) {
      return null;
    }
    return {
      activityCode: result.nafCode,
      category: result.category,
      denomination: result.denomination,
      registryId: result.siren,
      tradeName: result.tradeName,
    };
  },
};
