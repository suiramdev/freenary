import { env } from "@freenary/env/server";

import { mapNafToCategory } from "./naf-categories";
import type { SireneResult } from "./types";

const SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";
const FETCH_TIMEOUT_MS = 5000;

interface SireneEtablissement {
  activite_principale: string | null;
  enseigne: string | null;
}

interface SireneEntry {
  matching_etablissements: SireneEtablissement[];
  nom_complet: string;
  nom_raison_sociale: string | null;
  siren: string;
}

interface SireneResponse {
  results: SireneEntry[];
}

export const canLookupSirene = (
  deploymentEnabled: boolean,
  userPermitted: boolean
): boolean => deploymentEnabled && userPermitted;

/**
 * Query recherche-entreprises for a business name and return the NAF-derived
 * category. Returns null on network error, no results, or unmappable NAF code.
 * Never throws.
 */
export const lookupSirene = async (
  creditorName: string,
  allowExternalLookup = false
): Promise<SireneResult | null> => {
  if (!canLookupSirene(env.SIRENE_LOOKUP_ENABLED, allowExternalLookup)) {
    return null;
  }

  try {
    const name = creditorName.trim().replaceAll(/\s+/gu, " ");
    if (!name) {
      return null;
    }

    const url = `${SEARCH_URL}?q=${encodeURIComponent(name)}&page=1&per_page=3`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 429) {
      console.warn("[sirene] rate-limited by recherche-entreprises (429)");
      return null;
    }

    if (!response.ok) {
      return null;
    }

    // SAFETY: the response shape is defined by the DINUM API contract
    const body = (await response.json()) as SireneResponse;

    const entry = body.results?.[0];
    if (!entry) {
      return null;
    }

    const etablissement = entry.matching_etablissements?.[0];
    const nafCode = etablissement?.activite_principale ?? null;
    if (!nafCode) {
      return null;
    }

    const category = mapNafToCategory(nafCode);
    if (!category) {
      return null;
    }

    return {
      category,
      denomination: entry.nom_raison_sociale ?? entry.nom_complet,
      nafCode,
      siren: entry.siren,
      tradeName: etablissement?.enseigne ?? null,
    };
  } catch {
    // Network error, timeout, or JSON parse failure — swallow silently.
    return null;
  }
};
