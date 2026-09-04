import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiErrorWarningLine, RiPlugLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";

import { BankConnectionPanel } from "@/components/bank/bank-connection-panel";
import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { useScrollToAnchor } from "@/hooks/shared/use-scroll-to-anchor";
import { BANK_ACCOUNTS_ANCHOR } from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

export const BankAccountsSection = () => {
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

  const sectionRef = useScrollToAnchor<HTMLDivElement>(
    BANK_ACCOUNTS_ANCHOR,
    !availability.isPending
  );

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
              <RiErrorWarningLine />
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
              <RiPlugLine />
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
