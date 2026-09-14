import { cn } from "@freenary/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Content still on screen from the previous view while the next one loads. The
 * fade waits 100 ms, so an answer that arrives first never flickers; the
 * return to full opacity is immediate.
 *
 * No status message of its own: three regions announcing at once on a period
 * change is noise, so the page renders one status line for all of them.
 */
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
