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
import { Spinner } from "@freenary/ui/components/spinner";
import { useMemo } from "react";

import { SecurityRowsSkeleton } from "@/components/settings/security-rows-skeleton";
import { SecuritySessionRow } from "@/components/settings/security-session-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSessionRevocation } from "@/hooks/settings/use-session-revocation";
import { authClient } from "@/lib/auth-client";
import type { UserSession } from "@/lib/settings/auth-queries";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface SecuritySessionsSectionProps {
  isPending: boolean;
  /** Undefined once the list has failed rather than merely not arrived. */
  sessions: UserSession[] | undefined;
}

export const SecuritySessionsSection = ({
  isPending,
  sessions,
}: SecuritySessionsSectionProps) => {
  const { data: activeSession } = authClient.useSession();
  const {
    isRevokingOthers,
    revokeOtherSessions,
    revokeSession,
    revokingToken,
  } = useSessionRevocation();

  const locale = getLocale();
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  const currentToken = activeSession?.session.token;
  const ordered = useMemo(
    () =>
      (sessions ?? []).toSorted((left, right) => {
        if (left.token === currentToken) {
          return -1;
        }
        if (right.token === currentToken) {
          return 1;
        }
        return right.createdAt.getTime() - left.createdAt.getTime();
      }),
    [currentToken, sessions]
  );
  const otherCount = ordered.filter(
    (item) => item.token !== currentToken
  ).length;

  const renderRows = () => {
    if (isPending) {
      return <SecurityRowsSkeleton label={m.settings_sessions_loading()} />;
    }

    if (sessions === undefined) {
      return (
        <p className="text-muted-foreground">
          {m.settings_sessions_load_error()}
        </p>
      );
    }

    if (ordered.length === 0) {
      return (
        <p className="text-muted-foreground">{m.settings_sessions_empty()}</p>
      );
    }

    return (
      <ul className="flex flex-col gap-1.5">
        {ordered.map((item) => (
          <SecuritySessionRow
            formatter={formatter}
            isCurrent={item.token === currentToken}
            isRevoking={revokingToken === item.token}
            key={item.id}
            onRevoke={revokeSession}
            session={item}
          />
        ))}
      </ul>
    );
  };

  return (
    <SettingsSection
      action={
        otherCount > 0 ? (
          // Left open on confirm: success drops the other sessions, which
          // unmounts this action, and a failure keeps it available to retry.
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              {m.settings_sessions_revoke_others()}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {m.settings_sessions_revoke_others_title()}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {m.settings_sessions_revoke_others_description({
                    count: otherCount,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isRevokingOthers}
                  onClick={() => revokeOtherSessions()}
                  variant="destructive"
                >
                  {isRevokingOthers && <Spinner data-icon="inline-start" />}
                  {m.settings_sessions_revoke_others_confirm()}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null
      }
      description={m.settings_sessions_description()}
      title={m.settings_sessions_title()}
    >
      {renderRows()}
    </SettingsSection>
  );
};
