import { Skeleton } from "@freenary/ui/components/skeleton";

export const OnboardingSkeleton = () => (
  <div className="space-y-8">
    {/* Stepper */}
    <div className="flex items-center justify-center gap-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-px w-8 sm:w-12" />
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>

    {/* Step header */}
    <div className="space-y-2">
      <Skeleton className="mx-auto h-6 w-48" />
      <Skeleton className="mx-auto h-4 w-72" />
    </div>

    {/* Search input */}
    <Skeleton className="h-9 w-full rounded-md" />

    {/* List items */}
    <div className="space-y-1.5">
      {Array.from({ length: 4 }, (_, i) => (
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
  </div>
);
