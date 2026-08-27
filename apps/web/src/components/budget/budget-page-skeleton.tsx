import { Skeleton } from "@freenary/ui/components/skeleton";

import { TransactionRowsSkeleton } from "@/components/budget/transaction-rows-skeleton";

export const BudgetPageSkeleton = () => (
  <div aria-busy="true" className="flex flex-1 flex-col gap-6 p-4">
    <output className="sr-only">Loading budget</output>
    <div aria-hidden="true" className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[320px]" />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="flex gap-2 border-b pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-28" />
        </div>
        <TransactionRowsSkeleton rows={8} />
      </div>
    </div>
  </div>
);
