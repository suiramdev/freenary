import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";

import { BankCard } from "@/components/onboarding/bank-card";
import { BankListSkeleton } from "@/components/onboarding/bank-list-skeleton";

export type OnboardingBank =
  InferRouterOutputs<AppRouter>["onboarding"]["getAvailableBanks"]["banks"][number];

interface BankListProps {
  banks: OnboardingBank[];
  connected: ReadonlySet<string>;
  connecting: string | null;
  hasSearch: boolean;
  isError: boolean;
  isPending: boolean;
  onConnect: (institutionId: string, bankName: string) => void;
}

export const BankList = ({
  banks,
  connected,
  connecting,
  hasSearch,
  isError,
  isPending,
  onConnect,
}: BankListProps) => {
  if (isPending) {
    return (
      <div aria-busy="true" className="max-h-64 overflow-y-auto">
        <output className="sr-only">Loading banks</output>
        <div aria-hidden="true">
          <BankListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto">
      {isError && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          Could not load banks. You can skip this step and connect later.
        </p>
      )}
      {banks.length === 0 && !isError && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {hasSearch ? "No banks match your search." : "No banks available."}
        </p>
      )}
      {banks.map((bank) => (
        <BankCard
          key={bank.id}
          bic={bank.bic}
          connected={connected.has(bank.name)}
          connecting={connecting === bank.id}
          logo={bank.logo}
          name={bank.name}
          onConnect={() => onConnect(bank.id, bank.name)}
        />
      ))}
    </div>
  );
};
