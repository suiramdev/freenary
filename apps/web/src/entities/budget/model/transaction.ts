import type { SpendingCategory } from "@freenary/api/lib/taxonomy";

import { merchantName } from "@/shared/lib/text";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: SpendingCategory;
  derivedCategory: SpendingCategory;
  description: string;
  counterpartyName: string | null;
  normalisedDescriptor: string | null;
}

export const transactionTitle = (transaction: Transaction): string =>
  merchantName(transaction);
