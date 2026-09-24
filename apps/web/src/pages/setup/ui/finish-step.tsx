import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { Elevated } from "@freenary/ui/lib/elevated";
import { useIcon } from "@freenary/ui/lib/icon-context";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import {
  integrationTitle,
  stateColour,
  stateLabel,
  variantLabel,
} from "../model/labels";
import type { SetupIntegrationDescriptor } from "./provider-step";

const DISABLED_STATE = "disabled";
const SURFACE_RADIUS = "rounded-xl";
const SURFACE_STEP = 1;

interface FinishStepProps {
  integrations: SetupIntegrationDescriptor[];
  isCompleting: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export const FinishStep = ({
  integrations,
  isCompleting,
  onBack,
  onFinish,
}: FinishStepProps) => {
  const ArrowLeftIcon = useIcon("arrow-left");

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={m.setup_finish_description()}
        title={m.setup_finish_title()}
      />

      <Elevated className={SURFACE_RADIUS} offset={SURFACE_STEP}>
        <dl className="divide-border flex flex-col divide-y px-4">
          {integrations.map((integration) => (
            <div
              className="flex items-center justify-between gap-3 py-3"
              key={integration.id}
            >
              <dt className="text-sm">{integrationTitle(integration.id)}</dt>
              <dd className="flex items-center gap-2">
                {integration.state === DISABLED_STATE ? null : (
                  <span className="text-muted-foreground text-sm">
                    {variantLabel(integration.selectedVariantId)}
                  </span>
                )}
                {integration.configuredBy === "environment" ? (
                  <span className="text-muted-foreground text-xs">
                    {m.setup_recap_from_environment()}
                  </span>
                ) : null}
                <Badge color={stateColour(integration.state)}>
                  {stateLabel(integration.state)}
                </Badge>
              </dd>
            </div>
          ))}
        </dl>
      </Elevated>

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
