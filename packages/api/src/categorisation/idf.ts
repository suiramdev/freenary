/**
 * Token IDF (inverse document frequency) over the merchant dictionary.
 *
 * Used as a GATE — not a reranker — to reject matches that share only
 * generic tokens like "pharmacie" or "market".
 */

import prisma from "@freenary/db";

export interface TokenIdf {
  /** Total number of merchants in the corpus. */
  totalMerchants: number;
  /** IDF for a known token. Unknown tokens get maxIdf. */
  idf: Record<string, number>;
  /** ln(totalMerchants / 1) — the IDF assigned to unseen tokens. */
  maxIdf: number;
}

let cachedIdf: TokenIdf | null = null;
let loadingPromise: Promise<TokenIdf> | null = null;

const buildTokenIdf = async (): Promise<TokenIdf> => {
  const rows = await prisma.$queryRaw<{ token: string; df: bigint }[]>`
    SELECT token, COUNT(*)::bigint AS df
    FROM "merchant", unnest(string_to_array("normalisedName", ' ')) AS token
    WHERE token <> ''
    GROUP BY token
  `;

  const totalRow = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "merchant"
  `;

  const totalMerchants = Number(totalRow[0]?.count ?? 1);
  const maxIdf = Math.log(totalMerchants / 1);
  const idf: Record<string, number> = {};

  for (const row of rows) {
    idf[row.token] = Math.log(totalMerchants / Number(row.df));
  }

  return { idf, maxIdf, totalMerchants };
};

/**
 * Lazy-initialised, memoised IDF table.
 * Safe to call concurrently — only one query runs.
 */
export const getTokenIdf = async (): Promise<TokenIdf> => {
  if (cachedIdf) {
    return cachedIdf;
  }

  if (!loadingPromise) {
    loadingPromise = buildTokenIdf();
  }

  try {
    const result = await loadingPromise;
    cachedIdf = result;
    return result;
  } finally {
    loadingPromise = null;
  }
};

/** Clear the cached IDF table — call after reseeding or in tests. */
export const resetTokenIdf = (): void => {
  cachedIdf = null;
  loadingPromise = null;
};
