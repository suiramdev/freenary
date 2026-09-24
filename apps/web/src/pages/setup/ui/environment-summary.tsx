import { Button } from "@freenary/ui/components/button";
import { useIcon } from "@freenary/ui/lib/icon-context";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import {
  fieldLabel,
  integrationDescription,
  integrationTitle,
  variantGuideUrl,
  variantLabel,
} from "../model/labels";
import type { SaveOutcome } from "../model/outcome";
import { isFailedOutcome, outcomeMessage } from "../model/outcome";
import type { SetupIntegrationDescriptor } from "./provider-step";
import type { SetupFieldDescriptor } from "./setup-field";

const ENVIRONMENT_SOURCE = "environment";

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
  const guideUrl = variantGuideUrl(variantId);
  const providerIsDefault =
    descriptor.discriminantSource !== ENVIRONMENT_SOURCE;

  const environmentKeys = [
    ...(providerIsDefault ? [] : [descriptor.discriminantKey]),
    ...fields.flatMap((field) =>
      field.source === ENVIRONMENT_SOURCE ? [field.key] : []
    ),
  ];

  const isFailure = isFailedOutcome(outcome);

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={integrationDescription(descriptor.id)}
        title={integrationTitle(descriptor.id)}
      />

      <dl className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm">{m.setup_variant_label()}</dt>
          <dd className="text-sm font-medium">{variantLabel(variantId)}</dd>
        </div>
        {fields.map((field) => (
          <div
            className="flex items-center justify-between gap-3"
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

      <aside className="bg-muted/40 border-border flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <p>{m.setup_environment_note({ keys: environmentKeys.join(", ") })}</p>
        {providerIsDefault ? (
          <p className="text-muted-foreground">
            {m.setup_environment_default_provider({
              key: descriptor.discriminantKey,
              provider: variantLabel(variantId),
            })}
          </p>
        ) : null}
        {guideUrl === null ? null : (
          <a
            className="text-primary self-start underline underline-offset-2"
            href={guideUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {m.setup_variant_guide({ provider: variantLabel(variantId) })}
          </a>
        )}
      </aside>

      {outcome ? (
        <p
          className={
            isFailure
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
          role={isFailure ? "alert" : "status"}
        >
          {outcomeMessage(outcome)}
        </p>
      ) : null}

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
