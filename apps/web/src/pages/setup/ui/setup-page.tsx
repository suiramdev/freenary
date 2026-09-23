import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { useState } from "react";

import { m } from "@/paraglide/messages.js";
import { WizardShell } from "@/shared/ui/wizard-shell";
import { WizardStepper } from "@/shared/ui/wizard-stepper";

import { stepLabel } from "../model/labels";
import { useSetup } from "../model/use-setup";
import { ClaimStep } from "./claim-step";
import { FinishStep } from "./finish-step";
import type { SaveOutcome } from "./provider-step";
import { ProviderStep } from "./provider-step";
import { SetupWizardSkeleton } from "./setup-wizard-skeleton";

const CLAIM_STEP = "claim";
const FINISH_STEP = "finish";

export const SetupPage = () => {
  const setup = useSetup();
  const [outcomes, setOutcomes] = useState<Record<string, SaveOutcome>>({});

  const described = setup.configuration.data;
  const integrations = described?.integrations ?? [];
  const stepLabels = setup.steps.map((id) => () => stepLabel(id));

  const stepper = (
    <WizardStepper
      current={setup.stepIndex}
      label={m.setup_progress_label()}
      steps={stepLabels}
    />
  );

  const activeIntegration = integrations.find(
    (integration) => integration.id === setup.stepId
  );

  const body = () => {
    if (setup.isReconnecting) {
      return (
        <Empty>
          <EmptyTitle>{m.setup_restart_title()}</EmptyTitle>
          <EmptyDescription>{m.setup_restart_pending()}</EmptyDescription>
        </Empty>
      );
    }

    if (setup.configuration.isError) {
      return (
        <Empty>
          <EmptyTitle>{m.setup_not_operator_title()}</EmptyTitle>
          <EmptyDescription>
            {m.setup_not_operator_description()}
          </EmptyDescription>
        </Empty>
      );
    }

    if (setup.stepId === CLAIM_STEP) {
      return (
        <ClaimStep
          isSubmitting={setup.claim.isPending}
          onClaim={(token) => setup.claim.mutate({ token })}
        />
      );
    }

    if (setup.stepId === FINISH_STEP) {
      return (
        <FinishStep
          integrations={integrations}
          isCompleting={setup.complete.isPending}
          isRestarting={setup.restart.isPending}
          onBack={setup.handleBack}
          onFinish={() => setup.complete.mutate({})}
          onRestart={() => setup.restart.mutate({})}
          restartRequired={setup.restartRequired}
        />
      );
    }

    if (activeIntegration === undefined) {
      return null;
    }

    return (
      <ProviderStep
        descriptor={activeIntegration}
        isFirstStep={setup.stepIndex === 0}
        isSaving={setup.save.isPending}
        onBack={setup.handleBack}
        onSave={(variantId, values) =>
          setup.save.mutate(
            { integrationId: activeIntegration.id, values, variantId },
            {
              onSuccess: (outcome) =>
                setOutcomes((held) => ({
                  ...held,
                  [activeIntegration.id]: outcome,
                })),
            }
          )
        }
        onSkip={setup.handleNext}
        outcome={outcomes[activeIntegration.id]}
      />
    );
  };

  return (
    <WizardShell
      direction={setup.direction}
      isPending={setup.isPending}
      skeleton={<SetupWizardSkeleton />}
      stepKey={setup.stepId}
      stepper={stepper}
      toolbar={
        <Button onClick={setup.handleSignOut} type="button" variant="ghost">
          {m.account_sign_out()}
        </Button>
      }
    >
      {body()}
    </WizardShell>
  );
};
