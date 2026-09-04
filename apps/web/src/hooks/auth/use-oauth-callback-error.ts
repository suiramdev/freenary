import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  isCancelledOauthCallback,
  oauthCallbackErrorMessage,
} from "@/lib/auth/oauth-callback-error";

/**
 * Says out loud what a redirected-back OAuth failure was, then clears the
 * parameter so a reload does not repeat it. Guarded by a ref rather than by the
 * parameter alone: clearing it is a navigation, and the effect must not fire
 * twice for one arrival.
 */
export const useOauthCallbackError = (
  error: string | undefined,
  clear: () => void
) => {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (error === undefined || reported.current === error) {
      return;
    }
    reported.current = error;
    // A reader who declined on the provider's own screen knows what they did.
    if (!isCancelledOauthCallback(error)) {
      toast.error(oauthCallbackErrorMessage(error));
    }
    clear();
  }, [error, clear]);
};
