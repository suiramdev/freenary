import { Field, FieldError, FieldLabel } from "@freenary/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import type { ReactNode } from "react";

interface AuthFormFieldProps {
  /** Rendered in the input's trailing addon. */
  endAdornment?: ReactNode;
  errors: (string | undefined)[];
  id: string;
  label: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}

export const AuthFormField = ({
  endAdornment,
  errors,
  id,
  label,
  onBlur,
  onChange,
  placeholder,
  type,
  value,
}: AuthFormFieldProps) => {
  const isInvalid = errors.length > 0;

  return (
    <Field data-invalid={isInvalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* The group is unconditional: swapping it in and out remounts the input
          and drops focus mid-typing. */}
      <InputGroup>
        <InputGroupInput
          aria-invalid={isInvalid || undefined}
          id={id}
          name={id}
          placeholder={placeholder}
          type={type}
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
        {endAdornment ? (
          <InputGroupAddon align="inline-end">{endAdornment}</InputGroupAddon>
        ) : null}
      </InputGroup>
      <FieldError errors={errors.map((message) => ({ message }))} />
    </Field>
  );
};
