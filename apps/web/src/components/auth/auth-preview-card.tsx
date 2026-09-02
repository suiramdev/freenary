import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
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
}: AuthPreviewCardProps) => (
  <Card className={className} size="sm">
    <CardHeader>
      <CardDescription>{label}</CardDescription>
      {trailing ? <CardAction>{trailing}</CardAction> : null}
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <CardTitle className="tabular-nums">{value}</CardTitle>
        {subValue ? <CardDescription>{subValue}</CardDescription> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);
