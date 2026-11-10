import { Button } from "@freenary/ui/components/button";
import { RiArrowDownSLine, RiArrowUpSLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { remixIcon } from "@/shared/lib/remix-icon";

const ShowIcon = remixIcon(RiArrowDownSLine);
const HideIcon = remixIcon(RiArrowUpSLine);

export const ChartsToggle = ({
  controls,
  isOpen,
  onToggle,
}: {
  controls: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="flex">
    <Button
      aria-controls={controls}
      aria-expanded={isOpen}
      onClick={onToggle}
      size="compact"
      trailingIcon={isOpen ? HideIcon : ShowIcon}
      type="button"
      variant="tertiary"
    >
      {isOpen ? m.budget_charts_hide() : m.budget_charts_show()}
    </Button>
  </div>
);
