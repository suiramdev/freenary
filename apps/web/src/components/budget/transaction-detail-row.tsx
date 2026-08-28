import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@freenary/ui/components/item";
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
  // Flush with the drawer body, which already carries the horizontal padding.
  <Item className="px-0" render={<li />} size="sm">
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
