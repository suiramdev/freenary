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

import { BANK_ACCOUNTS_ANCHOR } from "@/components/settings/bank-accounts-section";
import { authClient } from "@/lib/auth-client";
import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { client, orpc } from "@/utils/orpc";

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  // TanStack Router auto-parses JSON-shaped query values into objects;
  // Enable Banking sends state as a JSON string, so coerce it back.
  state: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return;
    }
    return v instanceof Object ? JSON.stringify(v) : String(v);
  }, z.string().optional()),
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
    <output className="sr-only">Finishing bank connection</output>
    <div aria-hidden="true" className="flex flex-col items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-2 text-center">
        <Skeleton className="mx-auto h-4 w-52" />
        <Skeleton className="mx-auto h-3 w-36" />
      </div>
    </div>
  </div>
);

const EnableBankingCallback = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { exchangeResult } = useRouteContext({
    from: "/callback/enable-banking",
  });

  useEffect(() => {
    // Only a completed exchange creates the connection, so this is the first
    // moment anything may call the bank connected.
    if (exchangeResult.ok) {
      const count = exchangeResult.accounts.length;
      toast.success(
        count > 0
          ? `Connected ${count} account${count > 1 ? "s" : ""}`
          : "Bank connected"
      );
      void queryClient.invalidateQueries({
        queryKey: orpc.bankConnection.listConnections.queryOptions().queryKey,
      });
      void invalidateBudgetData(queryClient);
    } else if (exchangeResult.reason === "declined") {
      toast.error("Bank connection cancelled. Nothing was linked.");
    } else if (exchangeResult.reason === "failed") {
      toast.error(
        exchangeResult.returnTo === "settings"
          ? "Bank connection failed. You can try again."
          : "Bank connection failed. You can try again or skip."
      );
    } else {
      toast.error("Missing authorization code.");
    }

    if (exchangeResult.returnTo === "settings") {
      navigate({ hash: BANK_ACCOUNTS_ANCHOR, to: "/settings" });
      return;
    }
    navigate({ to: "/onboarding" });
  }, [exchangeResult, navigate, queryClient]);

  return <ConnectingBank />;
};

export const Route = createFileRoute("/callback/enable-banking")({
  // Exchanging the authorization code needs the session cookie, which only the
  // browser holds — this route cannot run on the server.
  ssr: false,
  pendingComponent: ConnectingBank,
  validateSearch: callbackSearchSchema,
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    // No code means nothing to exchange: the user declined or cancelled at the
    // bank, or landed here bare. The bank still echoes `state`, so the flow can
    // still return to wherever it started.
    if (!(search.code && search.state)) {
      return {
        exchangeResult: {
          ok: false as const,
          reason: search.error
            ? ("declined" as const)
            : ("incomplete" as const),
          returnTo: search.state ? readReturnTo(search.state) : "onboarding",
        },
      };
    }

    try {
      const result = await client.bankConnection.exchangeCode({
        code: search.code,
        state: search.state,
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
          returnTo: readReturnTo(search.state),
        },
      };
    }
  },
  component: EnableBankingCallback,
});
