import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { PlugsIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { BankConnectionPanel } from "@/components/bank/bank-connection-panel";
import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

/** Anchor the "connect a bank" prompts elsewhere in the app link to. */
export const BANK_ACCOUNTS_ANCHOR = "bank-accounts";

export const BankAccountsSection = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const availability = useQuery(
    orpc.bankConnection.getProviderAvailability.queryOptions()
  );
  const isAvailable = availability.data?.available ?? false;

  const banksQuery = useQuery(
    orpc.bankConnection.listInstitutions.queryOptions({
      enabled: isAvailable,
      // No country: the procedure answers for the user's own.
      input: {},
    })
  );

  // A hash arrived at by client-side navigation is not scrolled to, and this
  // section's content only lands after its queries answer.
  useEffect(() => {
    if (window.location.hash.slice(1) === BANK_ACCOUNTS_ANCHOR) {
      sectionRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);

  // Claiming the provider is missing before its query answers would flash a
  // wrong verdict on every load.
  const renderPanel = () => {
    if (availability.isPending) {
      return (
        <div aria-busy="true">
          <output className="sr-only">
            {m.settings_bank_accounts_loading()}
          </output>
          <div aria-hidden="true">
            <BankListSkeleton rows={2} />
          </div>
        </div>
      );
    }

    // A failed check is not a missing provider — saying so sends the user to
    // fix the wrong thing — and a failed refetch must not wipe a good answer.
    if (availability.isError && availability.data === undefined) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircleIcon />
            </EmptyMedia>
            <EmptyTitle>{m.settings_bank_check_error_title()}</EmptyTitle>
            <EmptyDescription>
              {m.settings_bank_check_error_description()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    if (!isAvailable) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlugsIcon />
            </EmptyMedia>
            <EmptyTitle>{m.settings_bank_unavailable_title()}</EmptyTitle>
            <EmptyDescription>
              {m.settings_bank_unavailable_description()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <BankConnectionPanel
        banks={banksQuery.data?.banks ?? []}
        isBanksError={banksQuery.isError}
        isBanksPending={banksQuery.isPending}
        returnTo="settings"
      />
    );
  };

  return (
    <div id={BANK_ACCOUNTS_ANCHOR} ref={sectionRef}>
      <SettingsSection
        description={m.settings_bank_accounts_description()}
        title={m.settings_bank_accounts_title()}
      >
        {renderPanel()}
      </SettingsSection>
    </div>
  );
};
