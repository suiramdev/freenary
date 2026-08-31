import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useOnboardingWizard } from "@/hooks/onboarding/use-onboarding-wizard";
import { orpc } from "@/utils/orpc";

const OnboardingPage = () => {
  const availability = useQuery(
    orpc.bankConnection.getProviderAvailability.queryOptions()
  );
  const hasBankStep = availability.data?.available ?? false;

  const wizard = useOnboardingWizard({ hasBankStep });

  const banksQuery = useQuery(
    orpc.bankConnection.listInstitutions.queryOptions({
      // Prefetch once a country is picked; the `step === 1` arm covers a flow
      // resumed into the bank step after Enable Banking went unavailable.
      enabled: wizard.country !== null && (hasBankStep || wizard.step === 1),
      input: { country: wizard.country ?? undefined },
    })
  );

  // Shares its cache entry with the panel's own query; the count only drives
  // the Finish label, and it counts banks the callback actually linked.
  const connectionsQuery = useQuery(
    orpc.bankConnection.listConnections.queryOptions()
  );

  return (
    <OnboardingWizard
      banks={banksQuery.data?.banks ?? []}
      connectedCount={connectionsQuery.data?.connections.length ?? 0}
      country={wizard.country}
      direction={wizard.direction}
      hasBankStep={hasBankStep}
      isBanksError={banksQuery.isError}
      isBanksPending={banksQuery.isPending}
      isCompleting={wizard.isCompleting}
      isPending={availability.isLoading}
      onBack={wizard.handleBack}
      onCountryContinue={wizard.handleCountryContinue}
      onCountrySelect={wizard.handleCountrySelect}
      onFinish={wizard.handleFinish}
      onSignOut={wizard.handleSignOut}
      step={wizard.step}
    />
  );
};

const OnboardingRoute = () => (
  <AuthGate audience="onboarding">
    <OnboardingPage />
  </AuthGate>
);

export const Route = createFileRoute("/onboarding")({
  component: OnboardingRoute,
});
