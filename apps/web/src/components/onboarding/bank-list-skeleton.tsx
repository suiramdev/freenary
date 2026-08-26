import { Skeleton } from "@freenary/ui/components/skeleton";

export const BankListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-1.5">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="size-8 rounded" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-18 rounded-md" />
      </div>
    ))}
  </div>
);
