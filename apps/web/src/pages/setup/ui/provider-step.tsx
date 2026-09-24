import { Button } from "@freenary/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";
import { useIcon } from "@freenary/ui/lib/icon-context";
import { useState } from "react";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import {
  integrationDescription,
  integrationTitle,
  variantGuideUrl,
  variantLabel,
} from "../model/labels";
import type { SetupFieldDescriptor } from "./setup-field";
import { SetupField } from "./setup-field";

export interface SetupVariantDescriptor {
  fields: SetupFieldDescriptor[];
  id: string;
}

export interface SetupIntegrationDescriptor {
  discriminantSource: string;
  id: string;
  selectedVariantId: string;
  state: string;
  variants: SetupVariantDescriptor[];
}

export interface SaveOutcome {
  checked?: boolean;
  detail?: string;
  keys?: string[];
  outcome: string;
  reason?: string;
  status?: number | null;
}

interface ProviderStepProps {
  descriptor: SetupIntegrationDescriptor;
  isChecking: boolean;
  isFirstStep: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCheck: (variantId: string, values: Record<string, string>) => void;
  onEdit: () => void;
  onSave: (variantId: string, values: Record<string, string>) => void;
  onSkip: () => void;
  outcome: SaveOutcome | undefined;
}

const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set([
  "saved",
  "verified",
  "nothing-to-save",
]);

const filledValuesOf = (
  variant: SetupVariantDescriptor | undefined
): Record<string, string> =>
  Object.fromEntries(
    (variant?.fields ?? []).flatMap((field) =>
      field.value === null || field.source === "environment"
        ? []
        : [[field.key, field.value]]
    )
  );

const outcomeMessage = (outcome: SaveOutcome): string => {
  if (outcome.outcome === "saved") {
    return outcome.checked === true
      ? m.setup_saved()
      : m.setup_saved_unchecked();
  }

  if (outcome.outcome === "verified") {
    return m.setup_verified();
  }

  if (outcome.outcome === "nothing-to-save") {
    return m.setup_nothing_to_save();
  }

  if (outcome.outcome === "missing-fields") {
    return m.setup_error_missing_fields({
      keys: (outcome.keys ?? []).join(", "),
    });
  }

  if (outcome.outcome === "environment-owned") {
    return m.setup_error_environment_owned({
      keys: (outcome.keys ?? []).join(", "),
    });
  }

  if (outcome.outcome === "invalid") {
    return m.setup_error_invalid({ detail: outcome.detail ?? "" });
  }

  if (outcome.reason === "rejected") {
    return m.setup_error_probe_rejected({
      detail: outcome.detail ?? "",
      status: outcome.status ?? 0,
    });
  }

  if (outcome.reason === "invalid") {
    return m.setup_error_probe_invalid({ detail: outcome.detail ?? "" });
  }

  return m.setup_error_probe_unreachable({ detail: outcome.detail ?? "" });
};

export const ProviderStep = ({
  descriptor,
  isChecking,
  isFirstStep,
  isSaving,
  onBack,
  onCheck,
  onEdit,
  onSave,
  onSkip,
  outcome,
}: ProviderStepProps) => {
  const ArrowLeftIcon = useIcon("arrow-left");
  const [variantId, setVariantId] = useState(descriptor.selectedVariantId);
  const [values, setValues] = useState<Record<string, string>>(() =>
    filledValuesOf(
      descriptor.variants.find(
        (entry) => entry.id === descriptor.selectedVariantId
      )
    )
  );

  const variant = descriptor.variants.find((entry) => entry.id === variantId);
  const lockedByEnvironment = descriptor.discriminantSource === "environment";
  const isFailure =
    outcome !== undefined && !SUCCESS_OUTCOMES.has(outcome.outcome);

  const isVerified = outcome?.outcome === "verified";
  const whollyFromEnvironment =
    lockedByEnvironment &&
    (variant?.fields ?? []).every((field) => field.source === "environment");

  const guideUrl = variantGuideUrl(variantId);

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={integrationDescription(descriptor.id)}
        title={integrationTitle(descriptor.id)}
      />

      {lockedByEnvironment ? (
        <p className="text-muted-foreground text-sm">
          {m.setup_locked_by_environment()}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Select
          disabled={lockedByEnvironment}
          onValueChange={(chosen) => {
            onEdit();
            setVariantId(chosen);
            setValues(
              filledValuesOf(
                descriptor.variants.find((entry) => entry.id === chosen)
              )
            );
          }}
          value={variantId}
        >
          <SelectTrigger
            aria-label={m.setup_variant_label()}
            placeholder={m.setup_variant_label()}
          />
          <SelectContent>
            <SelectGroup>
              {descriptor.variants.map((entry, position) => (
                <SelectItem index={position} key={entry.id} value={entry.id}>
                  {variantLabel(entry.id)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {guideUrl === null ? null : (
          <a
            className="text-primary self-start text-sm underline underline-offset-2"
            href={guideUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {m.setup_variant_guide({ provider: variantLabel(variantId) })}
          </a>
        )}

        {variant?.fields.map((field) => (
          <SetupField
            descriptor={field}
            key={field.key}
            onChange={(key, next) => {
              onEdit();
              setValues((held) => ({ ...held, [key]: next }));
            }}
            value={values[field.key]}
          />
        ))}
      </div>

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
          <Button onClick={onSkip} type="button" variant="ghost">
            {isVerified ? m.setup_next() : m.setup_skip()}
          </Button>
          <Button
            disabled={isSaving}
            loading={isChecking}
            onClick={() => onCheck(variantId, values)}
            type="button"
            variant="secondary"
          >
            {m.setup_check()}
          </Button>
          <Button
            disabled={whollyFromEnvironment || isChecking}
            loading={isSaving}
            onClick={() => onSave(variantId, values)}
            type="button"
          >
            {m.setup_save()}
          </Button>
        </div>
      </div>
    </div>
  );
};
