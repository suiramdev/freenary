import { FluidHoverHighlight } from "@freenary/ui/components/fluid-hover-highlight";
import type { UseFluidHoverReturn } from "@freenary/ui/hooks/use-fluid-hover";
import { cn } from "@freenary/ui/lib/utils";
import type { ReactNode, Ref } from "react";

import { SETTINGS_BLEED } from "./settings-section";

interface SettingsRowListProps {
  children: ReactNode;
  hover: UseFluidHoverReturn;
  ref: Ref<HTMLUListElement>;
}

const ITEM_SIDE_BORDER_CANCEL = "[&>li]:border-x-0";

const HIGHLIGHT_SQUARE_AT_CARD_EDGE = "rounded-none";

export const SettingsRowList = ({
  children,
  hover,
  ref,
}: SettingsRowListProps) => (
  <ul
    className={cn(
      "relative flex flex-col gap-1.5",
      ITEM_SIDE_BORDER_CANCEL,
      SETTINGS_BLEED
    )}
    ref={ref}
    {...hover.handlers}
  >
    <FluidHoverHighlight
      className={HIGHLIGHT_SQUARE_AT_CARD_EDGE}
      hover={hover}
    />
    {children}
  </ul>
);
