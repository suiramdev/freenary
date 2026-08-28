import { Skeleton } from "@freenary/ui/components/skeleton";
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
import { client } from "@/utils/orpc";

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

const EnableBankingCallback = () => {
  const navigate = useNavigate();
  const { exchangeResult } = useRouteContext({
    from: "/callback/enable-banking",
  });

  useEffect(() => {
    if (!exchangeResult) {
      toast.error("Missing authorization code.");
    } else if (exchangeResult.ok) {
      const count = exchangeResult.accounts.length;
      toast.success(
        count > 0
          ? `Connected ${count} account${count > 1 ? "s" : ""}`
          : "Bank connected"
      );
    } else {
      toast.error("Bank connection failed. You can try again or skip.");
    }
    navigate({ to: "/onboarding" });
  }, [exchangeResult, navigate]);

  return (
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
};

export const Route = createFileRoute("/callback/enable-banking")({
  ssr: false,
  validateSearch: callbackSearchSchema,
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    if (!(search.code && search.state)) {
      // SAFETY: null literal cast narrows the union for TanStack Router's context typing
      return { exchangeResult: null as null };
    }

    try {
      const result = await client.bankConnection.exchangeCode({
        code: search.code,
        state: search.state,
      });
      return {
        exchangeResult: { accounts: result.accounts, ok: true as const },
      };
    } catch {
      return { exchangeResult: { ok: false as const } };
    }
  },
  component: EnableBankingCallback,
});
