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
  variantLabel,
} from "../model/labels";
import type { SaveOutcome } from "../model/outcome";
import { GuideLink } from "./guide-link";
import { OutcomeNotice } from "./outcome-notice";
import type { SetupFieldDescriptor } from "./setup-field";
import { SetupField } from "./setup-field";

export interface SetupVariantDescriptor {
  fields: SetupFieldDescriptor[];
  id: string;
}

export interface SetupIntegrationDescriptor {
  configuredBy: string | null;
  discriminantKey: string;
  discriminantSource: string;
  id: string;
  selectedVariantId: string;
  state: string;
  variants: SetupVariantDescriptor[];
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

  const isVerified = outcome?.outcome === "verified";
  const whollyFromEnvironment =
    lockedByEnvironment &&
    (variant?.fields ?? []).every((field) => field.source === "environment");

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

        <GuideLink variantId={variantId} />

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
