import { Button } from "@freenary/ui/components/button";
import { Elevated } from "@freenary/ui/lib/elevated";
import { useIcon } from "@freenary/ui/lib/icon-context";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import {
  fieldLabel,
  integrationDescription,
  integrationTitle,
  variantLabel,
} from "../model/labels";
import type { SaveOutcome } from "../model/outcome";
import { GuideLink } from "./guide-link";
import { OutcomeNotice } from "./outcome-notice";
import type { SetupIntegrationDescriptor } from "./provider-step";
import type { SetupFieldDescriptor } from "./setup-field";

const ENVIRONMENT_SOURCE = "environment";
const SURFACE_RADIUS = "rounded-xl";
const SURFACE_STEP = 1;

interface EnvironmentSummaryProps {
  descriptor: SetupIntegrationDescriptor;
  isChecking: boolean;
  isFirstStep: boolean;
  onBack: () => void;
  onCheck: (variantId: string) => void;
  onNext: () => void;
  outcome: SaveOutcome | undefined;
}

const isSecretKind = (kind: string): boolean =>
  kind === "secret" || kind === "secret-block";

const readableValueOf = (field: SetupFieldDescriptor): string | null =>
  field.present && !isSecretKind(field.kind) ? field.value : null;

const placeholderOf = (field: SetupFieldDescriptor): string =>
  field.present
    ? m.setup_secret_from_environment()
    : m.setup_environment_unset();

export const EnvironmentSummary = ({
  descriptor,
  isChecking,
  isFirstStep,
  onBack,
  onCheck,
  onNext,
  outcome,
}: EnvironmentSummaryProps) => {
  const ArrowLeftIcon = useIcon("arrow-left");
  const variantId = descriptor.selectedVariantId;
  const variant = descriptor.variants.find((entry) => entry.id === variantId);
  const fields = variant?.fields ?? [];
  const providerIsDefault =
    descriptor.discriminantSource !== ENVIRONMENT_SOURCE;

  const environmentKeys = [
    ...(providerIsDefault ? [] : [descriptor.discriminantKey]),
    ...fields.flatMap((field) =>
      field.source === ENVIRONMENT_SOURCE ? [field.key] : []
    ),
  ];

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={integrationDescription(descriptor.id)}
        title={integrationTitle(descriptor.id)}
      />

      <Elevated className={SURFACE_RADIUS} offset={SURFACE_STEP}>
        <dl className="divide-border flex flex-col divide-y px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm">{m.setup_variant_label()}</dt>
            <dd className="text-sm font-medium">{variantLabel(variantId)}</dd>
          </div>
          {fields.map((field) => (
            <div
              className="flex items-center justify-between gap-3 py-3"
              key={field.key}
            >
              <dt className="text-sm">{fieldLabel(field.key)}</dt>
              <dd className="text-muted-foreground text-sm">
                {readableValueOf(field) === null ? (
                  placeholderOf(field)
                ) : (
                  <code className="font-mono">{readableValueOf(field)}</code>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Elevated>

      <Elevated className={SURFACE_RADIUS} offset={SURFACE_STEP}>
        <aside className="flex flex-col gap-2 p-4 text-sm">
          <p>
            {m.setup_environment_note({ keys: environmentKeys.join(", ") })}
          </p>
          {providerIsDefault ? (
            <p className="text-muted-foreground">
              {m.setup_environment_default_provider({
                key: descriptor.discriminantKey,
                provider: variantLabel(variantId),
              })}
            </p>
          ) : null}
          <GuideLink variantId={variantId} />
        </aside>
      </Elevated>

      <OutcomeNotice outcome={outcome} />

      <div className="flex items-center justify-between gap-3">
        {isFirstStep ? (
          <span />
        ) : (
          <Button
            leadingIcon={ArrowLeftIcon}
            onClick={onBack}
            type="button"
            variant="ghost"
          >
            {m.setup_back()}
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button
            loading={isChecking}
            onClick={() => onCheck(variantId)}
            type="button"
            variant="secondary"
          >
            {m.setup_check()}
          </Button>
          <Button onClick={onNext} type="button">
            {m.setup_next()}
          </Button>
        </div>
      </div>
    </div>
  );
};
