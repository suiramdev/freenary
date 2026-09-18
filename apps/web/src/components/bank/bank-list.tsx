import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { FluidHoverHighlight } from "@freenary/ui/components/fluid-hover-highlight";
import { ScrollArea } from "@freenary/ui/components/scroll-area";
import { useFluidHover } from "@freenary/ui/hooks/use-fluid-hover";
import { RiBankLine, RiErrorWarningLine } from "@remixicon/react";
import { useRef } from "react";

import { BankCard } from "@/components/bank/bank-card";
import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import type { BankConnection } from "@/hooks/bank/use-bank-connections";
import { institutionKey } from "@/lib/bank/bank-rows";
import type { BankRow } from "@/lib/bank/bank-rows";
import { countryName } from "@/lib/onboarding/countries";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface BankListProps {
  connecting: string | null;
  disconnectingId: string | null;
  hasSearch: boolean;
  isError: boolean;
  isPending: boolean;
  onConnect: (row: BankRow) => void;
  onDisconnect: (connectionId: string) => void;
  onSync: (connection: BankConnection) => void;
  rows: BankRow[];
  syncingId: string | null;
  unavailableCountries: string[];
}

const LIST_VIEWPORT_CLASS = "max-h-64 scroll-fade";

const UnavailableCountriesNotice = ({ countries }: { countries: string[] }) => {
  const locale = getLocale();

  if (countries.length === 0) {
    return null;
  }

  return (
    <output className="text-muted-foreground flex items-start gap-1.5 text-xs">
      <RiErrorWarningLine aria-hidden="true" className="size-4 shrink-0" />
      {m.bank_list_unavailable_countries({
        countries: new Intl.ListFormat(locale, { type: "conjunction" }).format(
          countries.map((code) => countryName(code, locale))
        ),
      })}
    </output>
  );
};

export const BankList = ({
  connecting,
  disconnectingId,
  hasSearch,
  isError,
  isPending,
  onConnect,
  onDisconnect,
  onSync,
  rows,
  syncingId,
  unavailableCountries,
}: BankListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(listRef, { axis: "y", gapClick: false });

  if (isPending) {
    return (
      <ScrollArea aria-busy="true" viewportClassName={LIST_VIEWPORT_CLASS}>
        <output className="sr-only">{m.bank_list_loading()}</output>
        <div aria-hidden="true">
          <BankListSkeleton rows={4} />
        </div>
      </ScrollArea>
    );
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiErrorWarningLine />
          </EmptyMedia>
          <EmptyTitle>{m.bank_list_error_title()}</EmptyTitle>
          <EmptyDescription>
            {m.bank_error_retry_description()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <UnavailableCountriesNotice countries={unavailableCountries} />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiBankLine />
            </EmptyMedia>
            <EmptyTitle>
              {hasSearch
                ? m.bank_list_empty_search_title()
                : m.bank_list_empty_title()}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <UnavailableCountriesNotice countries={unavailableCountries} />
      <ScrollArea viewportClassName={LIST_VIEWPORT_CLASS}>
        <div className="relative" ref={listRef} {...hover.handlers}>
          <FluidHoverHighlight className="rounded-md" hover={hover} />
          <ul className="flex flex-col gap-2.5">
            {rows.map((row, index) => (
              <BankCard
                key={row.id}
                connecting={
                  row.institution !== null &&
                  connecting === institutionKey(row.institution)
                }
                disconnecting={disconnectingId === row.connection?.id}
                hoverIndex={index}
                onConnect={() => onConnect(row)}
                onDisconnect={() => {
                  if (row.connection) {
                    onDisconnect(row.connection.id);
                  }
                }}
                onSync={() => {
                  if (row.connection) {
                    onSync(row.connection);
                  }
                }}
                registerHoverItem={hover.registerItem}
                row={row}
                syncing={syncingId === row.connection?.id}
              />
            ))}
          </ul>
        </div>
      </ScrollArea>
    </div>
  );
};
