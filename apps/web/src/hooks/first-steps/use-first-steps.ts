import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import type { FirstStepsState } from "@/lib/first-steps";
import { orpc } from "@/utils/orpc";

export const useFirstSteps = (): FirstStepsState | null => {
  const { data: session } = authClient.useSession();
  const isSessionReadable = session !== null;

  const connections = useQuery(
    orpc.bankConnection.listConnections.queryOptions({
      enabled: isSessionReadable,
    })
  );
  const profile = useQuery(
    orpc.settings.getBudgetProfile.queryOptions({
      enabled: isSessionReadable,
    })
  );
  const passkeys = authClient.useListPasskeys();

  const connectionCount = connections.data?.connections.length;
  const lineCount = profile.data?.lines.length;
  const hasTwoFactor = session?.user.twoFactorEnabled === true;
  const passkeyCount = passkeys.isPending
    ? undefined
    : (passkeys.data?.length ?? 0);

  return useMemo(
    () =>
      connectionCount === undefined ||
      lineCount === undefined ||
      passkeyCount === undefined
        ? null
        : {
            hasAccountProtection: hasTwoFactor || passkeyCount > 0,
            hasBankConnection: connectionCount > 0,
            hasBudgetLine: lineCount > 0,
          },
    [connectionCount, hasTwoFactor, lineCount, passkeyCount]
  );
};
