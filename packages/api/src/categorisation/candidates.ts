/**
 * Stage 3 candidate generation: KNN trigram lookup, then TypeScript rescoring.
 *
 * The indexable KNN operator (<->) retrieves a broad shortlist at ~30 ms,
 * then strict_word_similarity + similarity rescore. The containment
 * direction (<<%>) is NOT indexable and must never be used.
 */

import prisma from "@freenary/db";

import type { SpendingCategory } from "../lib/mcc-categories";
import { getTokenIdf } from "./idf";
import { normaliseTokens } from "./normalise/normalise-descriptor";
import { isPlaceToken } from "./place-tokens";
import type { MerchantCandidate } from "./types";

interface RawCandidateRow {
  id: string;
  name: string;
  category: string | null;
  swsim: number;
  sim: number;
  normalisedName: string;
}

/**
 * Compute the peak IDF among non-place tokens shared between the descriptor
 * and the candidate's normalised name. Place tokens (city names etc.) are
 * excluded so they can never be the evidence that satisfies the specificity gate.
 */
export const computeIdfPeak = (
  descriptorTokens: string[],
  candidateNormalised: string,
  idf: Record<string, number>,
  maxIdf: number
): number => {
  const candidateTokens = new Set(candidateNormalised.split(" "));
  let peak = 0;

  for (const token of descriptorTokens) {
    if (isPlaceToken(token)) {
      continue;
    }
    if (candidateTokens.has(token)) {
      const tokenIdf = idf[token] ?? maxIdf;
      if (tokenIdf > peak) {
        peak = tokenIdf;
      }
    }
  }

  return peak;
};

/**
 * Find merchant candidates via KNN trigram retrieval, rescored by
 * strict_word_similarity and similarity. Sorted best-first.
 */
export const findMerchantCandidates = async (
  descriptor: string,
  limit: number
): Promise<MerchantCandidate[]> => {
  if (descriptor.length <= 1) {
    return [];
  }

  // Retrieve from both merchant and merchant_alias tables, merge by merchantId
  const merchantRows = await prisma.$queryRaw<RawCandidateRow[]>`
    SELECT m."id", m."name", m."category",
           strict_word_similarity(m."normalisedName", ${descriptor}) AS swsim,
           similarity(m."normalisedName", ${descriptor}) AS sim,
           m."normalisedName"
    FROM "merchant" m
    ORDER BY m."normalisedName" <-> ${descriptor}
    LIMIT ${limit}
  `;

  const aliasRows = await prisma.$queryRaw<
    (RawCandidateRow & { merchantId: string })[]
  >`
    SELECT ma."merchantId" AS "id", m."name", m."category",
           strict_word_similarity(ma."normalisedAlias", ${descriptor}) AS swsim,
           similarity(ma."normalisedAlias", ${descriptor}) AS sim,
           ma."normalisedAlias" AS "normalisedName"
    FROM "merchant_alias" ma
    JOIN "merchant" m ON m."id" = ma."merchantId"
    ORDER BY ma."normalisedAlias" <-> ${descriptor}
    LIMIT ${limit}
  `;

  // Merge: keep best-scoring row per merchantId
  const bestById = new Map<string, RawCandidateRow>();
  for (const row of [...merchantRows, ...aliasRows]) {
    const existing = bestById.get(row.id);
    if (
      !existing ||
      row.swsim > existing.swsim ||
      (row.swsim === existing.swsim && row.sim > existing.sim)
    ) {
      bestById.set(row.id, row);
    }
  }

  const tokenIdf = await getTokenIdf();
  const descriptorTokens = normaliseTokens(descriptor);

  const candidates: MerchantCandidate[] = [];
  for (const row of bestById.values()) {
    candidates.push({
      // SAFETY: category column stores validated SpendingCategory values or null
      category: row.category as SpendingCategory | null,
      idfPeak: computeIdfPeak(
        descriptorTokens,
        row.normalisedName,
        tokenIdf.idf,
        tokenIdf.maxIdf
      ),
      merchantId: row.id,
      merchantName: row.name,
      similarity: row.sim,
      strictWordSimilarity: row.swsim,
    });
  }

  // Sort by swsim DESC, then similarity DESC
  candidates.sort(
    (a, b) =>
      b.strictWordSimilarity - a.strictWordSimilarity ||
      b.similarity - a.similarity
  );

  return candidates;
};
