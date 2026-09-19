import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@freenary/ui/components/alert-dialog";
import { Field, FieldError, FieldLabel } from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useEffect, useId } from "react";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";

interface SecurityPasskeyNameDialogProps {
  confirmLabel: string;
  defaultName: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  open: boolean;
  title: string;
}

const PASSKEY_NAME_MAX_LENGTH = 60;

const passkeyNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.settings_passkeys_error_name_required() })
    .max(PASSKEY_NAME_MAX_LENGTH, {
      error: () =>
        m.settings_passkeys_error_name_too_long({
          max: PASSKEY_NAME_MAX_LENGTH,
        }),
    }),
});

export const SecurityPasskeyNameDialog = ({
  confirmLabel,
  defaultName,
  description,
  onOpenChange,
  onSubmit,
  open,
  title,
}: SecurityPasskeyNameDialogProps) => {
  const fieldId = useId();
  const form = useForm({
    defaultValues: { name: defaultName },
    onSubmit: ({ value }) => {
      onSubmit(value.name.trim());
      onOpenChange(false);
    },
    validators: { onSubmit: passkeyNameSchema },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: defaultName });
    }
  }, [defaultName, form, open]);

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent size="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          <form.Field name="name">
            {(field) => (
              <Field
                className="py-4"
                data-invalid={field.state.meta.errors.length > 0}
              >
                <FieldLabel htmlFor={fieldId}>
                  {m.settings_passkeys_name_label()}
                </FieldLabel>
                <Input
                  aria-invalid={field.state.meta.errors.length > 0}
                  autoComplete="off"
                  id={fieldId}
                  maxLength={PASSKEY_NAME_MAX_LENGTH}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={m.settings_passkeys_name_placeholder()}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <AlertDialogFooter>
            <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
            <AlertDialogAction type="submit">{confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
