import type { ReactNode } from "react";

/** One label/value line in the transaction sheet: `media` replaces the muted `icon` slot. */
export const TransactionDetailRow = ({
  icon,
  media,
  label,
  children,
}: {
  icon?: ReactNode;
  media?: ReactNode;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-center gap-3">
    {media ?? (
      <div className="text-muted-foreground flex size-8 items-center justify-center">
        {icon}
      </div>
    )}
    <div className="flex flex-1 flex-col">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      {children}
    </div>
  </div>
);
