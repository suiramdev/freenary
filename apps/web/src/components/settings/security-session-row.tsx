import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@freenary/ui/components/item";
import { Spinner } from "@freenary/ui/components/spinner";

import type { UserSession } from "@/lib/settings/auth-queries";
import type { DeviceSlug } from "@/lib/settings/user-agent-device";
import { deviceSlugFromUserAgent } from "@/lib/settings/user-agent-device";
import { m } from "@/paraglide/messages.js";

interface SecuritySessionRowProps {
  formatter: Intl.DateTimeFormat;
  isCurrent: boolean;
  isRevoking: boolean;
  onRevoke: (token: string) => void;
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
  isCurrent,
  isRevoking,
  onRevoke,
  session,
}: SecuritySessionRowProps) => {
  const device = DEVICE_LABELS[deviceSlugFromUserAgent(session.userAgent)]();

  return (
    <Item render={<li />} size="sm">
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
            disabled={isRevoking}
            onClick={() => onRevoke(session.token)}
            variant="ghost"
          >
            {isRevoking && <Spinner data-icon="inline-start" />}
            {m.settings_sessions_revoke()}
          </Button>
        </ItemActions>
      )}
    </Item>
  );
};
