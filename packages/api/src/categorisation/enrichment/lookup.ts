import { env } from "@freenary/env/server";

import type { SpendingCategory } from "../../lib/mcc-categories";
import { mapEnrichmentCategory } from "./category-map";

export interface EnrichmentResult {
  merchantName: string;
  domain: string | null;
  category: SpendingCategory | null;
}

const ENDPOINT = "https://api.logo.dev/enrich/transaction";
const FETCH_TIMEOUT_MS = 5000;

export const canLookupEnrichment = (): boolean => !!env.LOGO_DEV_API_KEY;

/**
 * Query Logo.dev for transaction enrichment data.
 * Returns null when the API key is unset, on network error, or on any failure.
 * Never throws.
 */
export const lookupEnrichment = async (
  descriptor: string
): Promise<EnrichmentResult | null> => {
  if (!canLookupEnrichment()) {
    return null;
  }

  try {
    const response = await fetch(ENDPOINT, {
      body: JSON.stringify({ description: descriptor }),
      headers: {
        Authorization: `Bearer ${env.LOGO_DEV_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 429) {
      console.warn("[enrichment] rate-limited by Logo.dev (429)");
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      category?: string;
      domain?: string;
      merchant?: string;
    };

    const merchantName = body.merchant;
    if (!merchantName) {
      return null;
    }

    return {
      category: body.category ? mapEnrichmentCategory(body.category) : null,
      domain: body.domain ?? null,
      merchantName,
    };
  } catch {
    return null;
  }
};
