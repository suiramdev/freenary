import { cn } from "@freenary/ui/lib/utils";
import type { ReactNode } from "react";

export const StaleRegion = ({
  children,
  className,
  isStale,
}: {
  children: ReactNode;
  className?: string;
  isStale: boolean;
}) => (
  <div
    aria-busy={isStale || undefined}
    className={cn(
      "transition-opacity duration-150",
      isStale && "opacity-60 delay-100",
      className
    )}
  >
    {children}
  </div>
);
