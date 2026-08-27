import { Skeleton } from "@freenary/ui/components/skeleton";

/** Router-level placeholder: a page-shaped stand-in while a route resolves. */
export const PageSkeleton = () => (
  <div aria-busy="true" className="flex flex-1 flex-col gap-6 p-4">
    <output className="sr-only">Loading page</output>
    <div aria-hidden="true" className="flex flex-1 flex-col gap-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  </div>
);
