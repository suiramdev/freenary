import { Input } from "@freenary/ui/components/input";
import { Label } from "@freenary/ui/components/label";
import type { ReactNode } from "react";

interface AuthFormFieldProps {
  /** Rendered on top of the input's trailing edge. */
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
}: AuthFormFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {/* The wrapper is unconditional: swapping it in and out remounts the input
        and drops focus mid-typing. */}
    <div className="relative">
      <Input
        id={id}
        name={id}
        placeholder={placeholder}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      {endAdornment}
    </div>
    {errors.map((error) => (
      <p key={error} className="text-destructive text-xs">
        {error}
      </p>
    ))}
  </div>
);
