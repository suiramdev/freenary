import { Item, ItemActions, ItemContent } from "@freenary/ui/components/item";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { useSize } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";

import { SETTINGS_BLEED } from "@/components/settings/settings-section";

interface SecurityRowsSkeletonProps {
  loadingLabel: string;
  rows?: number;
}

const SkeletonLine = ({
  className,
  lineBox,
}: {
  className: string;
  lineBox: string;
}) => (
  <span className={cn("flex items-center", lineBox)}>
    <Skeleton className={className} />
  </span>
);

export const SecurityRowsSkeleton = ({
  loadingLabel,
  rows = 2,
}: SecurityRowsSkeletonProps) => {
  const { control } = useSize();

  return (
    <div aria-busy="true">
      <output className="sr-only">{loadingLabel}</output>
      <ul
        aria-hidden="true"
        className={cn(
          "flex flex-col gap-1.5 [&>li]:border-x-0",
          SETTINGS_BLEED
        )}
      >
        {Array.from({ length: rows }, (_, i) => (
          <Item key={i} render={<li />} size="sm">
            <ItemContent className="min-w-0">
              <SkeletonLine className="h-3 w-32" lineBox="h-[1.375em]" />
              <SkeletonLine className="h-2.5 w-48" lineBox="h-[1.625em]" />
            </ItemContent>
            <ItemActions>
              <Skeleton className={cn("w-20 rounded-md", control)} />
            </ItemActions>
          </Item>
        ))}
      </ul>
    </div>
  );
};
