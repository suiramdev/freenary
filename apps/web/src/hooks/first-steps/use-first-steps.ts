import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import type { FirstStepsState } from "@/lib/first-steps";
import { orpc } from "@/utils/orpc";

/**
 * Completion read from the user's own records, so it stays right for someone
 * who skipped onboarding. Null until both queries answered: a half-read state
 * would nudge toward a step that is already done.
 */
export const useFirstSteps = (): FirstStepsState | null => {
  // The session lives on the API's own origin and is unreadable while the page
  // is server-rendered, so gating on it keeps these protected calls off the server.
  const { data: session } = authClient.useSession();
  const enabled = session !== null;

  const connections = useQuery(
    orpc.bankConnection.listConnections.queryOptions({ enabled })
  );
  const profile = useQuery(
    orpc.settings.getBudgetProfile.queryOptions({ enabled })
  );

  const connectionCount = connections.data?.connections.length;
  const lineCount = profile.data?.lines.length;

  // A fresh object each render would retrigger every consumer effect keyed on it.
  return useMemo(
    () =>
      connectionCount === undefined || lineCount === undefined
        ? null
        : {
            hasBankConnection: connectionCount > 0,
            hasBudgetLine: lineCount > 0,
          },
    [connectionCount, lineCount]
  );
};
