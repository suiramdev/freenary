import { Button } from "@freenary/ui/components/button";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { Switch } from "@freenary/ui/components/switch";
import { useState } from "react";

import { m } from "@/paraglide/messages.js";
import { authClient } from "@/shared/auth";

import type { TwoFactorPurpose } from "../model/use-two-factor-enrollment";
import { SecurityTwoFactorDialog } from "./security-two-factor-dialog";
import { SecurityTwoFactorDisableDialog } from "./security-two-factor-disable-dialog";
import { SettingsSection } from "./settings-section";

interface SecurityTwoFactorSectionProps {
  hasPassword: boolean | undefined;
  isAccountsPending: boolean;
}

export const SecurityTwoFactorSection = ({
  hasPassword,
  isAccountsPending,
}: SecurityTwoFactorSectionProps) => {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [purpose, setPurpose] = useState<TwoFactorPurpose>("enable");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  const isEnabled = session?.user.twoFactorEnabled === true;

  const isEnrolmentOnOffer = !(isPending || isEnabled);
  const hasConfirmedPassword = hasPassword === true;
  const explainsMissingPassword = isEnrolmentOnOffer && hasPassword === false;
  const explainsAccountsOutage =
    isEnrolmentOnOffer && hasPassword === undefined && !isAccountsPending;

  const renderHeaderAction = () => {
    if (isPending || isAccountsPending) {
      return (
        <div className="flex min-h-7 items-center">
          <Skeleton aria-hidden="true" className="h-4 w-7 rounded-full" />
        </div>
      );
    }

    return (
      <div className="flex min-h-7 items-center gap-2">
        {isEnabled && (
          <Button
            onClick={() => {
              setPurpose("regenerate");
              setIsDialogOpen(true);
            }}
            variant="tertiary"
          >
            {m.settings_2fa_regenerate()}
          </Button>
        )}
        <Switch
          aria-label={m.settings_2fa_title()}
          checked={isEnabled}
          disabled={!(isEnabled || hasConfirmedPassword)}
          onCheckedChange={(next) => {
            if (next) {
              setPurpose("enable");
              setIsDialogOpen(true);

              return;
            }

            setIsDisableOpen(true);
          }}
        />
      </div>
    );
  };

  return (
    <SettingsSection
      action={renderHeaderAction()}
      description={m.settings_2fa_description()}
      title={m.settings_2fa_title()}
    >
      <div aria-busy={isPending || undefined} className="flex flex-col gap-2">
        {isPending ? (
          <Skeleton aria-hidden="true" className="h-[1.5em] w-full max-w-md" />
        ) : (
          <p className="text-muted-foreground">
            {isEnabled
              ? m.settings_2fa_on_explanation()
              : m.settings_2fa_off_explanation()}
          </p>
        )}
        {isPending && (
          <output className="sr-only">{m.settings_2fa_loading()}</output>
        )}
        <p className="text-muted-foreground">
          {explainsMissingPassword
            ? m.settings_2fa_no_password_note()
            : m.settings_2fa_scope_explained()}
        </p>
        {explainsAccountsOutage && (
          <p className="text-muted-foreground">
            {m.settings_2fa_accounts_error()}
          </p>
        )}
      </div>

      <SecurityTwoFactorDialog
        onEnabled={() => {
          void refetch();
        }}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
        purpose={purpose}
      />

      <SecurityTwoFactorDisableDialog
        onDisabled={() => {
          void refetch();
        }}
        onOpenChange={setIsDisableOpen}
        open={isDisableOpen}
      />
    </SettingsSection>
  );
};
