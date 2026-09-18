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
import { useFluidHover } from "@freenary/ui/hooks/use-fluid-hover";
import { useMemo, useRef } from "react";

import { SecurityRowsSkeleton } from "@/components/settings/security-rows-skeleton";
import { SecuritySessionRow } from "@/components/settings/security-session-row";
import { SettingsRowList } from "@/components/settings/settings-row-list";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSessionRevocation } from "@/hooks/settings/use-session-revocation";
import { authClient } from "@/lib/auth-client";
import type { UserSession } from "@/lib/settings/auth-queries";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface SecuritySessionsSectionProps {
  isPending: boolean;
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
  const listRef = useRef<HTMLUListElement>(null);
  const hover = useFluidHover(listRef, { axis: "y", gapClick: false });

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
      return (
        <SecurityRowsSkeleton loadingLabel={m.settings_sessions_loading()} />
      );
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
      <SettingsRowList hover={hover} ref={listRef}>
        {ordered.map((item, index) => (
          <SecuritySessionRow
            formatter={formatter}
            index={index}
            isCurrent={item.token === currentToken}
            isRevoking={revokingToken === item.token}
            key={item.id}
            onRevoke={revokeSession}
            registerItem={hover.registerItem}
            session={item}
          />
        ))}
      </SettingsRowList>
    );
  };

  return (
    <SettingsSection
      action={
        otherCount > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="tertiary" />}>
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
                  loading={isRevokingOthers}
                  onClick={() => revokeOtherSessions()}
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                >
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
