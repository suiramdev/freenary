import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@freenary/ui/components/alert-dialog";
import { Button } from "@freenary/ui/components/button";
import { Field, FieldError, FieldLabel } from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import { Spinner } from "@freenary/ui/components/spinner";
import { useEffect, useState } from "react";

import { useTwoFactorDisable } from "@/hooks/settings/use-two-factor-disable";
import { m } from "@/paraglide/messages.js";

interface SecurityTwoFactorDisableDialogProps {
  /** Refetches the session, whose user carries the flag the section reads. */
  onDisabled: () => void;
}

/**
 * Turning the second factor off lowers account security, so it asks twice: the
 * confirmation, and the password that guards the endpoint.
 */
export const SecurityTwoFactorDisableDialog = ({
  onDisabled,
}: SecurityTwoFactorDisableDialogProps) => {
  const [open, setOpen] = useState(false);
  const { form, passwordError, reset } = useTwoFactorDisable({
    onDisabled,
    onDone: () => setOpen(false),
  });

  // Reopening must not offer the previous attempt's password back.
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        {m.settings_2fa_disable()}
      </AlertDialogTrigger>
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
                  disabled={isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {isSubmitting && <Spinner data-icon="inline-start" />}
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
