import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@freenary/ui/components/item";
import { useRegisterFluidHoverItem } from "@freenary/ui/hooks/use-fluid-hover";
import { useRef } from "react";

import { m } from "@/paraglide/messages.js";

import type { UserSession } from "../api/auth-queries";
import type { DeviceSlug } from "../model/user-agent-device";
import { deviceSlugFromUserAgent } from "../model/user-agent-device";

interface SecuritySessionRowProps {
  formatter: Intl.DateTimeFormat;
  index: number;
  isCurrent: boolean;
  isRevoking: boolean;
  onRevoke: (token: string) => void;
  registerItem: (index: number, element: HTMLElement | null) => void;
  session: UserSession;
}

const DEVICE_LABELS = {
  android: m.settings_sessions_device_android,
  chromebook: m.settings_sessions_device_chromebook,
  ipad: m.settings_sessions_device_ipad,
  iphone: m.settings_sessions_device_iphone,
  linux: m.settings_sessions_device_linux,
  mac: m.settings_sessions_device_mac,
  unknown: m.settings_sessions_device_unknown,
  windows: m.settings_sessions_device_windows,
} satisfies Record<DeviceSlug, () => string>;

export const SecuritySessionRow = ({
  formatter,
  index,
  isCurrent,
  isRevoking,
  onRevoke,
  registerItem,
  session,
}: SecuritySessionRowProps) => {
  const device = DEVICE_LABELS[deviceSlugFromUserAgent(session.userAgent)]();
  const rowRef = useRef<HTMLDivElement>(null);

  useRegisterFluidHoverItem(registerItem, index, rowRef);

  return (
    <Item className="relative z-10" ref={rowRef} render={<li />} size="sm">
      <ItemContent className="min-w-0">
        <ItemTitle className="flex flex-wrap items-center gap-2">
          {device}
          {isCurrent && <Badge>{m.settings_sessions_current()}</Badge>}
        </ItemTitle>
        <ItemDescription className="flex flex-wrap gap-x-3">
          <span>
            {m.settings_sessions_created({
              date: formatter.format(session.createdAt),
            })}
          </span>
          <span>
            {m.settings_sessions_updated({
              date: formatter.format(session.updatedAt),
            })}
          </span>
          {session.ipAddress ? (
            <span>{m.settings_sessions_ip({ ip: session.ipAddress })}</span>
          ) : null}
        </ItemDescription>
      </ItemContent>

      {isCurrent ? null : (
        <ItemActions>
          <Button
            aria-label={m.settings_sessions_revoke_device({ device })}
            loading={isRevoking}
            onClick={() => onRevoke(session.token)}
            variant="ghost"
          >
            {m.settings_sessions_revoke()}
          </Button>
        </ItemActions>
      )}
    </Item>
  );
};
