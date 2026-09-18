import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@freenary/ui/components/item";
import type { ReactNode } from "react";

const FLUSH_WITH_DRAWER_PADDING = "px-0";

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
  <Item className={FLUSH_WITH_DRAWER_PADDING} render={<li />} size="sm">
    {media ? (
      <ItemMedia>{media}</ItemMedia>
    ) : (
      <ItemMedia className="text-muted-foreground size-8" variant="icon">
        {icon}
      </ItemMedia>
    )}
    <ItemContent>
      <ItemDescription>{label}</ItemDescription>
      {children}
    </ItemContent>
  </Item>
);
