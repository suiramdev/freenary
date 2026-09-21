import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { Tooltip } from "@freenary/ui/components/tooltip";
import { RiRefreshLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface SyncButtonProps {
  isSyncing: boolean;
  label: string;
  onSync: () => void;
  size?: "icon" | "icon-compact";
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
      {isSyncing ? <Spinner /> : <RiRefreshLine />}
    </Button>
  </Tooltip>
);
