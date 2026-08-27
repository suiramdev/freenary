import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useOnboardingWizard } from "@/hooks/onboarding/use-onboarding-wizard";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

const OnboardingPage = () => {
  const availability = useQuery(
    orpc.onboarding.getEnableBankingAvailability.queryOptions()
  );
  const hasBankStep = availability.data?.available ?? false;

  const wizard = useOnboardingWizard({ hasBankStep });

  const banksQuery = useQuery(
    orpc.onboarding.getAvailableBanks.queryOptions({
      // Prefetch once a country is picked; the `step === 1` arm covers a flow
      // resumed into the bank step after Enable Banking went unavailable.
      enabled: wizard.country !== null && (hasBankStep || wizard.step === 1),
      input: { country: wizard.country ?? "" },
    })
  );

  return (
    <OnboardingWizard
      banks={banksQuery.data?.banks ?? []}
      connectedBanks={wizard.connectedBanks}
      country={wizard.country}
      hasBankStep={hasBankStep}
      isBanksError={banksQuery.isError}
      isBanksPending={banksQuery.isPending}
      isCompleting={wizard.isCompleting}
      isPending={availability.isLoading}
      onBack={wizard.handleBack}
      onBankConnected={wizard.handleBankConnected}
      onCountryContinue={wizard.handleCountryContinue}
      onCountrySelect={wizard.handleCountrySelect}
      onFinish={wizard.handleFinish}
      onSignOut={wizard.handleSignOut}
      step={wizard.step}
    />
  );
};

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const status = await client.onboarding.getStatus();
    if (status.completed) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingPage,
});
