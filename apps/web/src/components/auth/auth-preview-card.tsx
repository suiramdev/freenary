import { cn } from "@freenary/ui/lib/utils";
import type { ReactNode } from "react";

interface AuthPreviewCardProps {
  /** Visualisation shown under the figure. */
  children: ReactNode;
  className?: string;
  label: string;
  /** Secondary figure on the value row, e.g. a goal the value counts towards. */
  subValue?: string;
  /** Styled by the caller because each card colours its metric differently. */
  trailing?: ReactNode;
  value: string;
}

export const AuthPreviewCard = ({
  children,
  className,
  label,
  subValue,
  trailing,
  value,
}: AuthPreviewCardProps) => {
  const labelNode = (
    <span className="text-muted-foreground text-xs">{label}</span>
  );
  const valueNode = <p className="text-lg font-bold tabular-nums">{value}</p>;

  return (
    <div
      className={cn(
        "border-border/50 bg-card/80 space-y-1 border p-3 backdrop-blur-sm",
        className
      )}
    >
      {trailing ? (
        <div className="flex items-baseline justify-between">
          {labelNode}
          {trailing}
        </div>
      ) : (
        labelNode
      )}
      {subValue ? (
        <div className="flex items-baseline justify-between">
          {valueNode}
          <span className="text-muted-foreground text-xs">{subValue}</span>
        </div>
      ) : (
        valueNode
      )}
      {children}
    </div>
  );
};
