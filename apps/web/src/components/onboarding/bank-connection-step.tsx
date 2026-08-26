import { Button } from "@freenary/ui/components/button";
import { Input } from "@freenary/ui/components/input";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { client, orpc } from "@/utils/orpc";

import { BankCard } from "./bank-card";
import { BankListSkeleton } from "./bank-list-skeleton";
import { persistOnboardingState } from "./onboarding-state";
import { OnboardingStepHeader } from "./onboarding-step-header";

interface BankConnectionStepProps {
  connected: ReadonlySet<string>;
  country: string;
  onBack: () => void;
  onConnected: (bankName: string) => void;
  onFinish: () => void;
}

export const BankConnectionStep = ({
  connected,
  country,
  onBack,
  onConnected,
  onFinish,
}: BankConnectionStepProps) => {
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const banksQuery = useQuery(
    orpc.onboarding.getAvailableBanks.queryOptions({ input: { country } })
  );

  const filtered = useMemo(() => {
    const banks = banksQuery.data?.banks ?? [];
    if (!search.trim()) {
      return banks;
    }
    const q = search.toLowerCase();
    return banks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.bic && b.bic.toLowerCase().includes(q))
    );
  }, [banksQuery.data?.banks, search]);

  const handleConnect = async (bankName: string) => {
    setConnecting(bankName);
    const state = crypto.randomUUID();
    const result = await client.bankConnection
      .startConnection({ bankCountry: country, bankName, state })
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

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        description="Connect your bank accounts to import transactions and balances. You can always do this later."
        title="Connect your bank"
      />
      <div className="relative">
        <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          className="bg-background pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search banks..."
          type="search"
          value={search}
        />
      </div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {banksQuery.isLoading && <BankListSkeleton />}
        {banksQuery.isError && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Could not load banks. You can skip this step and connect later.
          </p>
        )}
        {!banksQuery.isLoading &&
          filtered.length === 0 &&
          !banksQuery.isError && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              {search ? "No banks match your search." : "No banks available."}
            </p>
          )}
        {filtered.map((bank) => (
          <BankCard
            key={bank.name}
            bic={bank.bic}
            connected={connected.has(bank.name)}
            connecting={connecting === bank.name}
            logo={bank.logo}
            name={bank.name}
            onConnect={() => {
              void handleConnect(bank.name);
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button onClick={onBack} type="button" variant="ghost">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={onFinish} type="button" variant="secondary">
            Skip for now
          </Button>
          <Button onClick={onFinish} type="button">
            {connected.size > 0 ? `Finish (${connected.size})` : "Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
};
