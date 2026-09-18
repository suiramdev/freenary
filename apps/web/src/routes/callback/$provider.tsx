import { Skeleton } from "@freenary/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { Data, Effect, Option } from "effect";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { BANK_ACCOUNTS_ANCHOR } from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

type CallbackDestination = "onboarding" | "settings";

class BankCodeExchangeFailed extends Data.TaggedError(
  "BankCodeExchangeFailed"
)<{
  readonly providerId: string;
  readonly cause: unknown;
}> {}

const callbackSearchSchema = z
  .record(z.string(), z.unknown())
  .transform((search) => {
    const providerSentParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== null) {
        providerSentParams[key] =
          value instanceof Object ? JSON.stringify(value) : String(value);
      }
    }

    return providerSentParams;
  });

const parseCallbackDestination = Option.liftThrowable(
  (state: string): CallbackDestination => {
    // SAFETY: the state is unverified, and is only trusted far enough to compare one field against two of our own page names
    const parsed = JSON.parse(state) as { returnTo?: unknown };

    return parsed.returnTo === "settings" ? "settings" : "onboarding";
  }
);

const callbackDestination = (state: string): CallbackDestination =>
  Option.getOrElse(
    parseCallbackDestination(state),
    () => "onboarding" as const
  );

const exchangeCallbackCode = (
  providerId: string,
  params: Record<string, string>,
  state: string
) =>
  Effect.tryPromise({
    catch: (cause) => new BankCodeExchangeFailed({ cause, providerId }),
    try: () => client.bankConnection.exchangeCode({ params, providerId }),
  }).pipe(
    Effect.map((result) => ({
      accounts: result.accounts,
      ok: true as const,
      returnTo: result.returnTo,
    })),
    Effect.catchTag("BankCodeExchangeFailed", () =>
      Effect.succeed({
        ok: false as const,
        reason: "failed" as const,
        returnTo: callbackDestination(state),
      })
    )
  );

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
  ssr: false,
  pendingComponent: ConnectingBank,
  validateSearch: callbackSearchSchema,
  beforeLoad: async ({ params, search }) => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const { error, state } = search;

    if (error) {
      return {
        exchangeResult: {
          ok: false as const,
          reason: "declined" as const,
          returnTo: state ? callbackDestination(state) : "onboarding",
        },
      };
    }

    if (!state) {
      return {
        exchangeResult: {
          ok: false as const,
          reason: "incomplete" as const,
          returnTo: "onboarding" as const,
        },
      };
    }

    return {
      exchangeResult: await Effect.runPromise(
        exchangeCallbackCode(params.provider, search, state)
      ),
    };
  },
  component: BankConnectionCallback,
});
