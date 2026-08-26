import { Skeleton } from "@freenary/ui/components/skeleton";

export const BudgetPageSkeleton = () => (
  <div className="flex flex-1 flex-col gap-6 p-4">
    {/* Period navigator */}
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

    {/* Charts */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
      <Skeleton className="h-[280px]" />
      <Skeleton className="h-[320px]" />
    </div>

    {/* Transaction list */}
    <div className="flex flex-1 flex-col gap-3">
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
