import type { SpendingCategory } from "../lib/mcc-categories";
import type { TransactionChannel } from "./normalise/types";

export type ResolutionBand = "auto" | "suggest" | "unknown";
export type ResolutionStage =
  | "channel"
  | "dictionary"
  | "intermediary"
  | "learned"
  | "mcc"
  | "memo"
  | "none"
  | "sirene";

export interface MerchantCandidate {
  merchantId: string;
  merchantName: string;
  category: SpendingCategory | null;
  /** strict_word_similarity(normalisedName, descriptor) in 0..1 — the retriever score. */
  strictWordSimilarity: number;
  /** similarity(normalisedName, descriptor) in 0..1 — the tiebreak score. */
  similarity: number;
  /** Highest IDF among tokens shared with the descriptor; the specificity gate. */
  idfPeak: number;
}

export interface ResolutionResult {
  merchantId: string | null;
  merchantName: string | null;
  category: SpendingCategory | null;
  intermediaryId: string | null;
  intermediaryName: string | null;
  /** 0..1. */
  confidence: number;
  band: ResolutionBand;
  stage: ResolutionStage;
  /** Top candidates, best first. Empty when no dictionary lookup ran. */
  candidates: MerchantCandidate[];
}

export interface ResolveRequest {
  userId: string;
  normalisedDescriptor: string;
  rawDescriptor: string;
  channel: TransactionChannel;
  creditorIban?: string | null;
  merchantCategoryCode?: string | null;
  amountMinor: number;
}

export interface MemoHit {
  memoId: string;
  merchantId: string | null;
  merchantName: string | null;
  intermediaryId: string | null;
  category: SpendingCategory | null;
  /** True when the memo belongs to this specific user; false for global. */
  isUserScoped: boolean;
  source: string;
}

export interface UpsertUserMemoInput {
  userId: string;
  normalisedDescriptor: string;
  merchantId?: string | null;
  intermediaryId?: string | null;
  category: SpendingCategory | null;
}
