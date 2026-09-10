import { Button } from "@freenary/ui/components/button";
import { Tooltip } from "@freenary/ui/components/tooltip";
import { RiRefreshLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface SyncButtonProps {
  isSyncing: boolean;
  label: string;
  onSync: () => void;
  size?: "icon" | "icon-sm";
}

export const SyncButton = ({
  isSyncing,
  label,
  onSync,
  size = "icon",
}: SyncButtonProps) => (
  <Tooltip content={isSyncing ? m.budget_sync_running() : label}>
    <Button
      aria-label={isSyncing ? m.budget_sync_running() : label}
      disabled={isSyncing}
      onClick={onSync}
      size={size}
      type="button"
      variant="ghost"
    >
      <RiRefreshLine className={isSyncing ? "animate-spin" : undefined} />
    </Button>
  </Tooltip>
);
