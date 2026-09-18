import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  isCancelledOauthCallback,
  oauthCallbackErrorMessage,
} from "@/lib/auth/oauth-callback-error";

export const useOauthCallbackError = (
  error: string | undefined,
  clear: () => void
) => {
  const alreadyReported = useRef<string | null>(null);

  useEffect(() => {
    if (error === undefined || alreadyReported.current === error) {
      return;
    }

    alreadyReported.current = error;

    if (!isCancelledOauthCallback(error)) {
      toast.error(oauthCallbackErrorMessage(error));
    }

    clear();
  }, [error, clear]);
};
