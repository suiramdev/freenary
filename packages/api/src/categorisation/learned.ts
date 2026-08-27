/**
 * Stage 4: learned classifier — fuzzy memo lookup.
 *
 * Queries user-corrected descriptor_memo rows via pg_trgm similarity,
 * then votes on a category. Not a trained model; the "learning" is
 * implicit in existing memo rows from user corrections.
 */

import prisma from "@freenary/db";

import type { SpendingCategory } from "../lib/mcc-categories";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LearnedMatch {
  /** Best pg_trgm similarity score among the matches. */
  bestSimilarity: number;
  category: SpendingCategory;
  /** 0..1 */
  confidence: number;
  /** How many similar memos voted for this category. */
  matchCount: number;
  merchantId: string | null;
  merchantName: string | null;
}

export interface LearnedVoteInput {
  category: SpendingCategory;
  isUserScoped: boolean;
  merchantId: string | null;
  merchantName: string | null;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface SimilarMemoRow {
  category: string;
  merchantId: string | null;
  merchantName: string | null;
  normalisedDescriptor: string;
  sim: number;
  userId: string | null;
}

// ---------------------------------------------------------------------------
// Pure voting logic — exported for unit testing without a database
// ---------------------------------------------------------------------------

/**
 * Given a set of similar memo rows, vote on the most likely category.
 * User-scoped results carry 2× weight. Returns null when evidence is
 * insufficient or categories are tied.
 */
export const computeLearnedVote = (
  results: LearnedVoteInput[]
): LearnedMatch | null => {
  if (results.length === 0) {
    return null;
  }

  const groups = new Map<
    SpendingCategory,
    {
      bestMerchantId: string | null;
      bestMerchantName: string | null;
      bestSimilarity: number;
      count: number;
      weight: number;
    }
  >();

  for (const r of results) {
    const w = r.isUserScoped ? 2 : 1;
    const existing = groups.get(r.category);
    if (existing) {
      existing.count += 1;
      existing.weight += w;
      if (r.similarity > existing.bestSimilarity) {
        existing.bestSimilarity = r.similarity;
        existing.bestMerchantId = r.merchantId;
        existing.bestMerchantName = r.merchantName;
      }
    } else {
      groups.set(r.category, {
        bestMerchantId: r.merchantId,
        bestMerchantName: r.merchantName,
        bestSimilarity: r.similarity,
        count: 1,
        weight: w,
      });
    }
  }

  // Pick the category with the highest weighted vote; bail on ties
  let bestCategory: SpendingCategory | null = null;
  let bestWeight = 0;
  let tied = false;

  for (const [cat, g] of groups) {
    if (g.weight > bestWeight) {
      bestCategory = cat;
      bestWeight = g.weight;
      tied = false;
    } else if (g.weight === bestWeight) {
      tied = true;
    }
  }

  if (bestCategory === null || tied) {
    return null;
  }

  const winner = groups.get(bestCategory);
  if (!winner) {
    return null;
  }

  // Convergent evidence: ≥ 2 memos agree, or a single near-exact match
  if (winner.count < 2 && winner.bestSimilarity < 0.8) {
    return null;
  }

  const raw =
    0.5 + 0.4 * winner.bestSimilarity * (winner.count / results.length);
  const confidence = Math.min(0.95, Math.max(0, raw));

  return {
    bestSimilarity: winner.bestSimilarity,
    category: bestCategory,
    confidence,
    matchCount: winner.count,
    merchantId: winner.bestMerchantId,
    merchantName: winner.bestMerchantName,
  };
};

// ---------------------------------------------------------------------------
// Database-backed entry point
// ---------------------------------------------------------------------------

/**
 * Find the most likely category by fuzzy-matching against user-corrected memos.
 * Returns null when no similar corrections exist or agreement is too low.
 */
export const findLearnedMatch = async (
  userId: string,
  normalisedDescriptor: string
): Promise<LearnedMatch | null> => {
  // Short descriptors produce only noise in trigram matching
  if (normalisedDescriptor.length <= 1) {
    return null;
  }

  try {
    const rows = await prisma.$queryRaw<SimilarMemoRow[]>`
      SELECT deduped.*
        FROM (
          SELECT DISTINCT ON (dm."normalisedDescriptor")
                 dm."normalisedDescriptor",
                 dm."category",
                 dm."merchantId",
                 m."name" AS "merchantName",
                 dm."userId",
                 similarity(dm."normalisedDescriptor", ${normalisedDescriptor}) AS sim
            FROM "descriptor_memo" dm
            LEFT JOIN "merchant" m ON m."id" = dm."merchantId"
           WHERE (dm."userId" = ${userId} OR dm."userId" IS NULL)
             AND dm."category" IS NOT NULL
             AND similarity(dm."normalisedDescriptor", ${normalisedDescriptor}) > 0.3
           ORDER BY dm."normalisedDescriptor", (dm."userId" IS NOT NULL) DESC
        ) AS deduped
       ORDER BY deduped.sim DESC
       LIMIT 10
    `;

    const inputs: LearnedVoteInput[] = [];
    for (const row of rows) {
      inputs.push({
        // SAFETY: category column stores validated SpendingCategory values
        category: row.category as SpendingCategory,
        isUserScoped: row.userId !== null,
        merchantId: row.merchantId,
        merchantName: row.merchantName,
        similarity: row.sim,
      });
    }

    return computeLearnedVote(inputs);
  } catch {
    // Never throw — a failed fuzzy lookup must not break the cascade
    return null;
  }
};
