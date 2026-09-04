import { Button } from "@freenary/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@freenary/ui/components/tooltip";
import { RiRefreshLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface SyncButtonProps {
  isSyncing: boolean;
  /** What the button re-syncs: its accessible name and its tooltip. */
  label: string;
  onSync: () => void;
  size?: "icon" | "icon-sm";
}

/**
 * Forces a re-synchronisation. The spin is the live cue and the disabled state
 * the static one, so the button still reads as busy with motion turned off.
 */
export const SyncButton = ({
  isSyncing,
  label,
  onSync,
  size = "icon",
}: SyncButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={isSyncing ? m.budget_sync_running() : label}
          disabled={isSyncing}
          onClick={onSync}
          size={size}
          type="button"
          variant="ghost"
        />
      }
    >
      <RiRefreshLine className={isSyncing ? "animate-spin" : undefined} />
    </TooltipTrigger>
    <TooltipContent>
      {isSyncing ? m.budget_sync_running() : label}
    </TooltipContent>
  </Tooltip>
);
