import { Skeleton } from "@freenary/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { BANK_ACCOUNTS_ANCHOR } from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

/**
 * Providers append their own query parameters, and TanStack Router auto-parses
 * JSON-shaped and numeric values — so each one is normalised back to the string
 * the provider actually sent, for whichever adapter knows what it means.
 */
const callbackSearchSchema = z
  .record(z.string(), z.unknown())
  .transform((search) => {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== null) {
        params[key] =
          value instanceof Object ? JSON.stringify(value) : String(value);
      }
    }
    return params;
  });

const readReturnTo = (state: string): "onboarding" | "settings" => {
  try {
    // SAFETY: shape is only trusted far enough to compare one field
    const parsed = JSON.parse(state) as { returnTo?: unknown };
    return parsed.returnTo === "settings" ? "settings" : "onboarding";
  } catch {
    return "onboarding";
  }
};

const ConnectingBank = () => (
  <div
    aria-busy="true"
    className="flex min-h-svh flex-col items-center justify-center gap-4"
  >
    <output className="sr-only">{m.bank_callback_loading()}</output>
    <div aria-hidden="true" className="flex flex-col items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-2 text-center">
        <Skeleton className="mx-auto h-4 w-52" />
        <Skeleton className="mx-auto h-3 w-36" />
      </div>
    </div>
  </div>
);

const BankConnectionCallback = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { exchangeResult } = useRouteContext({ from: "/callback/$provider" });

  useEffect(() => {
    // Only a completed exchange creates the connection, so this is the first
    // moment anything may call the bank connected.
    if (exchangeResult.ok) {
      const count = exchangeResult.accounts.length;
      const message =
        count > 0
          ? m.bank_callback_success_accounts({ count })
          : m.bank_callback_success();
      toast.success(message);
      void queryClient.invalidateQueries({
        queryKey: orpc.bankConnection.listConnections.queryOptions().queryKey,
      });
      void invalidateBudgetData(queryClient);
    } else if (exchangeResult.reason === "declined") {
      toast.error(m.bank_callback_declined());
    } else if (exchangeResult.reason === "failed") {
      toast.error(
        exchangeResult.returnTo === "settings"
          ? m.bank_callback_failed_settings()
          : m.bank_callback_failed_onboarding()
      );
    } else {
      toast.error(m.bank_callback_incomplete());
    }

    if (exchangeResult.returnTo === "settings") {
      navigate({ hash: BANK_ACCOUNTS_ANCHOR, to: "/settings" });
      return;
    }
    navigate({ to: "/onboarding" });
  }, [exchangeResult, navigate, queryClient]);

  return <ConnectingBank />;
};

export const Route = createFileRoute("/callback/$provider")({
  // Exchanging the provider's callback needs the session cookie, which only the
  // browser holds — this route cannot run on the server.
  ssr: false,
  pendingComponent: ConnectingBank,
  // Every provider appends its own parameters, so they all pass through to the
  // adapter that knows them.
  validateSearch: callbackSearchSchema,
  beforeLoad: async ({ params, search }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const { error, state } = search;

    // An `error` parameter means the user declined or cancelled at the bank;
    // the provider still echoes `state`, so the flow returns where it started.
    if (error) {
      return {
        exchangeResult: {
          ok: false as const,
          reason: "declined" as const,
          returnTo: state ? readReturnTo(state) : "onboarding",
        },
      };
    }

    // Without state there is nothing to verify the callback against.
    if (!state) {
      return {
        exchangeResult: {
          ok: false as const,
          reason: "incomplete" as const,
          returnTo: "onboarding" as const,
        },
      };
    }

    try {
      const result = await client.bankConnection.exchangeCode({
        params: search,
        providerId: params.provider,
      });
      return {
        exchangeResult: {
          accounts: result.accounts,
          ok: true as const,
          returnTo: result.returnTo,
        },
      };
    } catch {
      // The exchange never got far enough to report where it came from, so
      // read the destination off the unverified state. It only picks between
      // two of our own pages, and anything unexpected lands on onboarding.
      return {
        exchangeResult: {
          ok: false as const,
          reason: "failed" as const,
          returnTo: readReturnTo(state),
        },
      };
    }
  },
  component: BankConnectionCallback,
});
