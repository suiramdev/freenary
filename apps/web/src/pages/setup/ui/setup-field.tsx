import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import { Switch } from "@freenary/ui/components/switch";
import { Textarea } from "@freenary/ui/components/textarea";
import { useId } from "react";

import { m } from "@/paraglide/messages.js";

import { fieldLabel } from "../model/labels";

const TRUE = "true";
const FALSE = "false";
const SECRET_ROWS = 6;

export interface SetupFieldDescriptor {
  key: string;
  kind: string;
  present: boolean;
  required: boolean;
  source: string;
  value: string | null;
}

interface SetupFieldProps {
  descriptor: SetupFieldDescriptor;
  onChange: (key: string, value: string) => void;
  value: string | undefined;
}

const isSecret = (kind: string): boolean =>
  kind === "secret" || kind === "secret-block";

const inputType = (kind: string): string => {
  if (kind === "secret") {
    return "password";
  }

  return kind === "port" ? "number" : "text";
};

export const SetupField = ({
  descriptor,
  onChange,
  value,
}: SetupFieldProps) => {
  const inputId = useId();
  const ownedByEnvironment = descriptor.source === "environment";
  const hint = ownedByEnvironment
    ? m.setup_source_environment({ key: descriptor.key })
    : descriptor.key;

  const secretPlaceholder = () => {
    if (!isSecret(descriptor.kind) || !descriptor.present) {
      return;
    }

    return ownedByEnvironment
      ? m.setup_secret_from_environment()
      : m.setup_secret_unchanged_hint();
  };

  const held = value ?? descriptor.value ?? "";

  if (descriptor.kind === "toggle") {
    return (
      <Field orientation="horizontal">
        <FieldLabel htmlFor={inputId}>{fieldLabel(descriptor.key)}</FieldLabel>
        <Switch
          checked={held === TRUE}
          disabled={ownedByEnvironment}
          id={inputId}
          onCheckedChange={(checked) =>
            onChange(descriptor.key, checked ? TRUE : FALSE)
          }
        />
        <FieldDescription>{hint}</FieldDescription>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>
        {fieldLabel(descriptor.key)}
        {descriptor.required ? null : ` ${m.setup_field_optional()}`}
      </FieldLabel>
      {descriptor.kind === "secret-block" ? (
        <Textarea
          disabled={ownedByEnvironment}
          id={inputId}
          onChange={(event) => onChange(descriptor.key, event.target.value)}
          placeholder={secretPlaceholder()}
          rows={SECRET_ROWS}
          value={value ?? ""}
        />
      ) : (
        <Input
          disabled={ownedByEnvironment}
          id={inputId}
          onChange={(event) => onChange(descriptor.key, event.target.value)}
          placeholder={secretPlaceholder()}
          type={inputType(descriptor.kind)}
          value={isSecret(descriptor.kind) ? (value ?? "") : held}
        />
      )}
      <FieldDescription>{hint}</FieldDescription>
    </Field>
  );
};
