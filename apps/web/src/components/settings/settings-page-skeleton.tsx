import { Skeleton } from "@freenary/ui/components/skeleton";

export const SettingsPageSkeleton = () => (
  <div aria-busy="true" className="flex flex-1 flex-col gap-6 p-4">
    <output className="sr-only">Loading settings</output>
    <div aria-hidden="true" className="flex flex-1 flex-col gap-6">
      <Skeleton className="h-[420px]" />
      <Skeleton className="h-[320px]" />
    </div>
  </div>
);
