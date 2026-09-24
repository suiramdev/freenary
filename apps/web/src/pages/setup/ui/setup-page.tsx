import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@/paraglide/messages.js";
import { WizardShell } from "@/shared/ui/wizard-shell";
import { WizardStepper } from "@/shared/ui/wizard-stepper";

import { stepLabel } from "../model/labels";
import type { SaveOutcome } from "../model/outcome";
import { useSetup } from "../model/use-setup";
import { ClaimStep } from "./claim-step";
import { EnvironmentSummary } from "./environment-summary";
import { FinishStep } from "./finish-step";
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
    if (setup.restartPhase === "reconnecting") {
      return (
        <Empty>
          <EmptyTitle>{m.setup_applying_title()}</EmptyTitle>
          <EmptyDescription>{m.setup_applying_description()}</EmptyDescription>
        </Empty>
      );
    }

    if (setup.restartPhase === "stalled") {
      return (
        <Empty>
          <EmptyTitle>{m.setup_stalled_title()}</EmptyTitle>
          <EmptyDescription>{m.setup_stalled_description()}</EmptyDescription>
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
          onBack={setup.handleBack}
          onFinish={() => setup.complete.mutate({})}
        />
      );
    }

    if (activeIntegration === undefined) {
      return null;
    }

    const integrationId = activeIntegration.id;

    const recordOutcome = (outcome: SaveOutcome) =>
      setOutcomes((held) => ({ ...held, [integrationId]: outcome }));

    const clearOutcome = () =>
      setOutcomes((held) =>
        Object.fromEntries(
          Object.entries(held).filter(([id]) => id !== integrationId)
        )
      );

    if (activeIntegration.configuredBy === "environment") {
      return (
        <EnvironmentSummary
          descriptor={activeIntegration}
          isChecking={setup.check.isPending}
          isFirstStep={setup.stepIndex === 0}
          onBack={setup.handleBack}
          onCheck={(variantId) =>
            setup.check.mutate(
              { integrationId, values: {}, variantId },
              { onSuccess: recordOutcome }
            )
          }
          onNext={setup.handleNext}
          outcome={outcomes[integrationId]}
        />
      );
    }

    return (
      <ProviderStep
        descriptor={activeIntegration}
        isChecking={setup.check.isPending}
        isFirstStep={setup.stepIndex === 0}
        isSaving={setup.save.isPending}
        onBack={setup.handleBack}
        onCheck={(variantId, values) =>
          setup.check.mutate(
            { integrationId, values, variantId },
            { onSuccess: recordOutcome }
          )
        }
        onEdit={clearOutcome}
        onSave={(variantId, values) => {
          const checked = outcomes[integrationId]?.outcome === "verified";

          setup.save.mutate(
            { integrationId, values, variantId },
            {
              onSuccess: (outcome) => {
                recordOutcome({ ...outcome, checked });

                if (outcome.outcome === "saved") {
                  toast.success(
                    checked ? m.setup_saved() : m.setup_saved_unchecked()
                  );
                }
              },
            }
          );
        }}
        onSkip={setup.handleNext}
        outcome={outcomes[integrationId]}
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
