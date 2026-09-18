import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useOnboardingWizard } from "@/hooks/onboarding/use-onboarding-wizard";
import { orpc } from "@/utils/orpc";

const BANK_STEP_INDEX = 1;

const OnboardingPage = () => {
  const availability = useQuery(
    orpc.bankConnection.getProviderAvailability.queryOptions()
  );
  const hasBankStep = availability.data?.available ?? false;

  const wizard = useOnboardingWizard({ hasBankStep });
  const isBankStepReachable = hasBankStep || wizard.step === BANK_STEP_INDEX;

  const banksQuery = useQuery(
    orpc.bankConnection.listInstitutions.queryOptions({
      enabled: wizard.country !== null && isBankStepReachable,
      input: { country: wizard.country ?? undefined },
    })
  );

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
  beforeLoad: ({ context: { viewer } }) => {
    if (viewer.kind === "guest") {
      throw redirect({ to: "/login" });
    }

    if (viewer.kind === "member" && viewer.onboarded) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingRoute,
});
