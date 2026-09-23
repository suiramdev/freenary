import { Button } from "@freenary/ui/components/button";
import { useIcon } from "@freenary/ui/lib/icon-context";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import { integrationTitle, stateLabel } from "../model/labels";
import type { SetupIntegrationDescriptor } from "./provider-step";

interface FinishStepProps {
  integrations: SetupIntegrationDescriptor[];
  isCompleting: boolean;
  isRestarting: boolean;
  onBack: () => void;
  onFinish: () => void;
  onRestart: () => void;
  restartRequired: boolean;
}

export const FinishStep = ({
  integrations,
  isCompleting,
  isRestarting,
  onBack,
  onFinish,
  onRestart,
  restartRequired,
}: FinishStepProps) => {
  const ArrowLeftIcon = useIcon("arrow-left");

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={m.setup_finish_description()}
        title={m.setup_finish_title()}
      />

      <dl className="border-border flex flex-col gap-3 rounded-lg border p-4">
        {integrations.map((integration) => (
          <div
            className="flex items-center justify-between gap-3"
            key={integration.id}
          >
            <dt className="text-sm">{integrationTitle(integration.id)}</dt>
            <dd className="text-muted-foreground text-sm">
              {stateLabel(integration.state)}
            </dd>
          </div>
        ))}
      </dl>

      {restartRequired ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            {m.setup_restart_description()}
          </p>
          <Button
            className="self-start"
            loading={isRestarting}
            onClick={onRestart}
            type="button"
            variant="secondary"
          >
            {m.setup_restart_action()}
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          leadingIcon={ArrowLeftIcon}
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          {m.setup_back()}
        </Button>
        <Button loading={isCompleting} onClick={onFinish} type="button">
          {m.setup_finish_action()}
        </Button>
      </div>
    </div>
  );
};
