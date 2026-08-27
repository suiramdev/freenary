import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: SpendingCategory;
  derivedCategory: SpendingCategory;
  description: string;
  counterpartyName: string | null;
}
