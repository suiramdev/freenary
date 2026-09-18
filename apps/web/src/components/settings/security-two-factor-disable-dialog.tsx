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
import { useEffect } from "react";

import { useTwoFactorDisable } from "@/hooks/settings/use-two-factor-disable";
import { m } from "@/paraglide/messages.js";

interface SecurityTwoFactorDisableDialogProps {
  onDisabled: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const SecurityTwoFactorDisableDialog = ({
  onDisabled,
  onOpenChange,
  open,
}: SecurityTwoFactorDisableDialogProps) => {
  const { form, passwordError, reset } = useTwoFactorDisable({
    onDisabled,
    onDone: () => onOpenChange(false),
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.settings_2fa_disable_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.settings_2fa_disable_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form.Field name="password">
            {(field) => (
              <Field
                className="py-4"
                data-invalid={
                  field.state.meta.errors.length > 0 || passwordError !== null
                }
              >
                <FieldLabel htmlFor="two-factor-disable-password">
                  {m.settings_2fa_password_label()}
                </FieldLabel>
                <Input
                  aria-invalid={
                    field.state.meta.errors.length > 0 || passwordError !== null
                  }
                  autoComplete="current-password"
                  id="two-factor-disable-password"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={m.settings_2fa_password_placeholder()}
                  type="password"
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors}>
                  {passwordError}
                </FieldError>
              </Field>
            )}
          </form.Field>

          <AlertDialogFooter>
            <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <AlertDialogAction
                  loading={isSubmitting}
                  type="submit"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                >
                  {m.settings_2fa_disable_confirm()}
                </AlertDialogAction>
              )}
            </form.Subscribe>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
