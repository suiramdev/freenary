import { Elevated } from "@freenary/ui/lib/elevated";
import { cn } from "@freenary/ui/lib/utils";
import type { ReactNode } from "react";

export const ChartTooltipCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <Elevated
    className={cn(
      "grid items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
      className
    )}
    offset={2}
    shadowLevel={3}
  >
    {children}
  </Elevated>
);
