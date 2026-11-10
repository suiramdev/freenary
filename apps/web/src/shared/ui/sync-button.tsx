import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { Tooltip } from "@freenary/ui/components/tooltip";
import { Sync } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";

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
      {isSyncing ? <Spinner /> : <Sync color={CHART_COLOR_VARS.blue} />}
    </Button>
  </Tooltip>
);
