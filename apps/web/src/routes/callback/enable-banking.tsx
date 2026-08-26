import { SpinnerGapIcon } from "@phosphor-icons/react";
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
  state: z.string().optional(),
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <SpinnerGapIcon className="text-muted-foreground size-6 animate-spin" />
      <p className="text-muted-foreground text-sm">
        Connecting your bank account...
      </p>
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

    if (!search.code) {
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
