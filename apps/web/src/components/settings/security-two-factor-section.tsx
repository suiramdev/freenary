import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { useState } from "react";

import { SecurityTwoFactorDisableDialog } from "@/components/settings/security-two-factor-disable-dialog";
import { SecurityTwoFactorDrawer } from "@/components/settings/security-two-factor-drawer";
import { SettingsSection } from "@/components/settings/settings-section";
import type { TwoFactorPurpose } from "@/hooks/settings/use-two-factor-enrollment";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isEnabled = session?.user.twoFactorEnabled === true;

  const isEnrolmentOnOffer = !(isPending || isEnabled);
  const hasConfirmedPassword = hasPassword === true;
  const explainsMissingPassword = isEnrolmentOnOffer && hasPassword === false;
  const explainsAccountsOutage =
    isEnrolmentOnOffer && hasPassword === undefined && !isAccountsPending;

  const renderHeaderAction = () => {
    if (isPending || isAccountsPending) {
      return <Skeleton aria-hidden="true" className="h-8 w-28 rounded-md" />;
    }

    if (isEnabled) {
      return (
        <div className="flex flex-wrap gap-2">
          <SecurityTwoFactorDisableDialog
            onDisabled={() => {
              void refetch();
            }}
          />
          <Button
            onClick={() => {
              setPurpose("regenerate");
              setIsDrawerOpen(true);
            }}
            variant="tertiary"
          >
            {m.settings_2fa_regenerate()}
          </Button>
        </div>
      );
    }

    if (!hasConfirmedPassword) {
      return null;
    }

    return (
      <Button
        onClick={() => {
          setPurpose("enable");
          setIsDrawerOpen(true);
        }}
      >
        {m.settings_2fa_enable()}
      </Button>
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
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
        ) : (
          <>
            <Badge className="self-start" variant={isEnabled ? "solid" : "dot"}>
              {isEnabled
                ? m.settings_2fa_status_on()
                : m.settings_2fa_status_off()}
            </Badge>
            <p className="text-muted-foreground">
              {isEnabled
                ? m.settings_2fa_on_explanation()
                : m.settings_2fa_off_explanation()}
            </p>
          </>
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

      <SecurityTwoFactorDrawer
        onEnabled={() => {
          void refetch();
        }}
        onOpenChange={setIsDrawerOpen}
        open={isDrawerOpen}
        purpose={purpose}
      />
    </SettingsSection>
  );
};
