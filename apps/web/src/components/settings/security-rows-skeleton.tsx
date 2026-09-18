import { Skeleton } from "@freenary/ui/components/skeleton";

interface SecurityRowsSkeletonProps {
  loadingLabel: string;
  rows?: number;
}

export const SecurityRowsSkeleton = ({
  loadingLabel,
  rows = 2,
}: SecurityRowsSkeletonProps) => (
  <div aria-busy="true" className="flex flex-col gap-1.5">
    <output className="sr-only">{loadingLabel}</output>
    {Array.from({ length: rows }, (_, i) => (
      <div
        aria-hidden="true"
        className="flex items-center gap-3 rounded-md border px-3 py-2.5"
        key={i}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    ))}
  </div>
);
