import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BankList } from "@/components/onboarding/bank-list";
import type { OnboardingBank } from "@/components/onboarding/bank-list";
import { OnboardingSearchInput } from "@/components/onboarding/onboarding-search-input";
import { OnboardingStepHeader } from "@/components/onboarding/onboarding-step-header";
import { persistOnboardingState } from "@/lib/onboarding/onboarding-state";
import { client } from "@/utils/orpc";

interface BankConnectionStepProps {
  banks: OnboardingBank[];
  connected: ReadonlySet<string>;
  country: string;
  isBanksError: boolean;
  isBanksPending: boolean;
  isCompleting: boolean;
  onBack: () => void;
  onConnected: (bankName: string) => void;
  onFinish: () => void;
}

export const BankConnectionStep = ({
  banks,
  connected,
  country,
  isBanksError,
  isBanksPending,
  isCompleting,
  onBack,
  onConnected,
  onFinish,
}: BankConnectionStepProps) => {
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return banks;
    }
    const q = search.toLowerCase();
    return banks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.bic && b.bic.toLowerCase().includes(q))
    );
  }, [banks, search]);

  const handleConnect = async (institutionId: string, bankName: string) => {
    setConnecting(institutionId);
    const state = crypto.randomUUID();
    const result = await client.bankConnection
      .startConnection({
        bankCountry: country,
        bankName,
        institutionId,
        state,
      })
      .catch(() => null);

    if (result?.url) {
      onConnected(bankName);
      persistOnboardingState({
        connectedBanks: [...connected, bankName],
        country,
      });
      window.location.assign(result.url);
    } else {
      toast.error(`Could not connect to ${bankName}. Try again later.`);
      setConnecting(null);
    }
  };

  const finishLabel =
    connected.size > 0 ? `Finish (${connected.size})` : "Finish";

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader
        description="Connect your bank accounts to import transactions and balances. You can always do this later."
        title="Connect your bank"
      />
      <OnboardingSearchInput
        onChange={setSearch}
        placeholder="Search banks..."
        value={search}
      />
      <BankList
        banks={filtered}
        connected={connected}
        connecting={connecting}
        hasSearch={search.length > 0}
        isError={isBanksError}
        isPending={isBanksPending}
        onConnect={(institutionId, bankName) => {
          void handleConnect(institutionId, bankName);
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <Button onClick={onBack} type="button" variant="ghost">
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={onFinish} type="button" variant="secondary">
            Skip for now
          </Button>
          <Button disabled={isCompleting} onClick={onFinish} type="button">
            {isCompleting && <Spinner data-icon="inline-start" />}
            {finishLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
