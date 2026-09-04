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
  /**
   * Every password-guarded two-factor endpoint needs the account's password, so
   * an account created with a connected provider cannot enrol at all.
   * Undefined while the account list is unread or failed — not the same answer
   * as "no", and stating either would be a guess.
   */
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

  // Both notes at the foot of this card are about enrolling, which is only on
  // offer once the session says the second factor is off. Beside a working
  // Disable button they would call a live feature unavailable.
  const explainsEnrolment = !(isPending || isEnabled);

  // In the header, where every other Security section puts its primary action,
  // rather than as a content child that would stretch to the card's width.
  const renderHeaderAction = () => {
    // Claiming it is off before the session answers would offer the wrong door.
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
            variant="outline"
          >
            {m.settings_2fa_regenerate()}
          </Button>
        </div>
      );
    }

    // A failed account list is not evidence of a missing password, so the
    // control waits rather than disappearing on an outage.
    if (hasPassword !== true) {
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
            <Badge
              className="self-start"
              variant={isEnabled ? "default" : "outline"}
            >
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
        {/* The scope sentence is true either way, so it stands in whenever the
            missing-password note does not apply: "no password" read from an
            outage would be false for every password user. */}
        <p className="text-muted-foreground">
          {explainsEnrolment && hasPassword === false
            ? m.settings_2fa_no_password_note()
            : m.settings_2fa_scope_explained()}
        </p>
        {explainsEnrolment &&
          hasPassword === undefined &&
          !isAccountsPending && (
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
