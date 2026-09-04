import { Button } from "@freenary/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@freenary/ui/components/drawer";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiFileCopyLine } from "@remixicon/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect } from "react";
import { toast } from "sonner";

import type {
  TwoFactorPurpose,
  TwoFactorStage,
} from "@/hooks/settings/use-two-factor-enrollment";
import { useTwoFactorEnrollment } from "@/hooks/settings/use-two-factor-enrollment";
import { TOTP_CODE_LENGTH } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

const QR_SIZE_PX = 168;

const STAGE_DESCRIPTIONS = {
  codes: m.settings_2fa_step_codes_description,
  confirm: m.settings_2fa_step_confirm_description,
  password: m.settings_2fa_step_password_description,
  scan: m.settings_2fa_step_scan_description,
} satisfies Record<TwoFactorStage, () => string>;

interface SecurityTwoFactorDrawerProps {
  onEnabled: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  purpose: TwoFactorPurpose;
}

/**
 * Enrolment and code re-issue share one surface because they share their first
 * step (the password) and their last (codes shown exactly once).
 */
export const SecurityTwoFactorDrawer = ({
  onEnabled,
  onOpenChange,
  open,
  purpose,
}: SecurityTwoFactorDrawerProps) => {
  const {
    backupCodes,
    codeError,
    codeForm,
    passwordError,
    passwordForm,
    reset,
    showConfirmStage,
    stage,
    totpUri,
  } = useTwoFactorEnrollment({ onEnabled, purpose });

  // The component survives close/reopen, so a second run would otherwise start
  // on the previous run's stage with its password still typed in.
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success(m.settings_2fa_codes_copied());
    } catch {
      toast.error(m.settings_2fa_codes_copy_error());
    }
  };

  return (
    <Drawer
      onOpenChange={(next) => {
        // The codes are shown exactly once, so acknowledging them is the only
        // way out of that stage — no backdrop click, no Escape.
        if (!next && stage === "codes") {
          return;
        }
        onOpenChange(next);
      }}
      open={open}
      swipeDirection="right"
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {purpose === "regenerate"
              ? m.settings_2fa_drawer_title_regenerate()
              : m.settings_2fa_drawer_title_enable()}
          </DrawerTitle>
          <DrawerDescription>{STAGE_DESCRIPTIONS[stage]()}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4 pt-0">
          {stage === "password" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                passwordForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <passwordForm.Field name="password">
                  {(field) => (
                    <Field
                      data-invalid={
                        field.state.meta.errors.length > 0 ||
                        passwordError !== null
                      }
                    >
                      <FieldLabel htmlFor="two-factor-password">
                        {m.settings_2fa_password_label()}
                      </FieldLabel>
                      <Input
                        aria-invalid={
                          field.state.meta.errors.length > 0 ||
                          passwordError !== null
                        }
                        autoComplete="current-password"
                        id="two-factor-password"
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder={m.settings_2fa_password_placeholder()}
                        type="password"
                        value={field.state.value}
                      />
                      <FieldError errors={field.state.meta.errors}>
                        {passwordError}
                      </FieldError>
                    </Field>
                  )}
                </passwordForm.Field>

                <Field className="justify-end" orientation="horizontal">
                  <Button
                    onClick={() => onOpenChange(false)}
                    type="button"
                    variant="ghost"
                  >
                    {m.settings_cancel()}
                  </Button>
                  <passwordForm.Subscribe
                    selector={(state) => state.isSubmitting}
                  >
                    {(isSubmitting) => (
                      <Button disabled={isSubmitting} type="submit">
                        {isSubmitting && <Spinner data-icon="inline-start" />}
                        {m.settings_2fa_continue()}
                      </Button>
                    )}
                  </passwordForm.Subscribe>
                </Field>
              </FieldGroup>
            </form>
          )}

          {stage === "scan" && (
            <>
              <figure className="flex flex-col items-center gap-2">
                {/* The QR spec needs a light quiet zone, which dark mode would eat. */}
                <div className="rounded-md bg-white p-3">
                  <QRCodeSVG
                    marginSize={2}

                    size={QR_SIZE_PX}
                    title={m.settings_2fa_qr_label()}
                    value={totpUri}
                  />
                </div>
                <figcaption className="text-muted-foreground">
                  {m.settings_2fa_qr_caption()}
                </figcaption>
              </figure>

              <div className="flex flex-col gap-1.5">
                <p className="font-medium">{m.settings_2fa_manual_label()}</p>
                <code className="bg-muted rounded-md p-2 font-mono break-all select-all">
                  {totpUri}
                </code>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="ghost"
                >
                  {m.settings_cancel()}
                </Button>
                <Button onClick={showConfirmStage} type="button">
                  {m.settings_2fa_continue()}
                </Button>
              </div>
            </>
          )}

          {stage === "confirm" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                codeForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <codeForm.Field name="code">
                  {(field) => (
                    <Field
                      data-invalid={
                        field.state.meta.errors.length > 0 || codeError !== null
                      }
                    >
                      <FieldLabel htmlFor="two-factor-code">
                        {m.settings_2fa_code_label()}
                      </FieldLabel>
                      <Input
                        aria-invalid={
                          field.state.meta.errors.length > 0 ||
                          codeError !== null
                        }
                        autoComplete="one-time-code"
                        id="two-factor-code"
                        inputMode="numeric"
                        maxLength={TOTP_CODE_LENGTH}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder={m.settings_2fa_code_placeholder()}
                        value={field.state.value}
                      />
                      <FieldError errors={field.state.meta.errors}>
                        {codeError}
                      </FieldError>
                    </Field>
                  )}
                </codeForm.Field>

                <Field className="justify-end" orientation="horizontal">
                  <Button
                    onClick={() => onOpenChange(false)}
                    type="button"
                    variant="ghost"
                  >
                    {m.settings_cancel()}
                  </Button>
                  <codeForm.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                      <Button disabled={isSubmitting} type="submit">
                        {isSubmitting && <Spinner data-icon="inline-start" />}
                        {m.settings_2fa_confirm()}
                      </Button>
                    )}
                  </codeForm.Subscribe>
                </Field>
              </FieldGroup>
            </form>
          )}

          {stage === "codes" && (
            <>
              <p className="text-muted-foreground">
                {m.settings_2fa_codes_warning()}
              </p>
              {purpose === "regenerate" && (
                <p className="text-destructive">
                  {m.settings_2fa_codes_replaced()}
                </p>
              )}
              <ul className="grid grid-cols-2 gap-1 rounded-md border p-3 font-mono select-all">
                {backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    void copyCodes();
                  }}
                  type="button"
                  variant="outline"
                >
                  <RiFileCopyLine />
                  {m.settings_2fa_codes_copy()}
                </Button>
                <Button onClick={() => onOpenChange(false)} type="button">
                  {m.settings_2fa_codes_acknowledge()}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
