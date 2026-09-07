import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuSearch,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { RiStore2Line } from "@remixicon/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TransactionDirection } from "@/lib/budget/search";
import { toggleMerchant } from "@/lib/budget/transaction-filters";
import { foldForSearch } from "@/lib/search-text";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

/** How long typing settles before the merchant list is asked again. */
const MERCHANT_SETTLE_MS = 250;

const SKELETON_ROWS = [0, 1, 2, 3];

interface MerchantFilterMenuProps {
  direction: TransactionDirection;
  from: Date;
  merchants: string[];
  onMerchantsChange: (merchants: string[]) => void;
  to: Date;
}

/**
 * The transaction list's company filter. The list comes from the period's own
 * transactions, most frequent first, and typing narrows it on the server: the
 * picker holds the top rows, never the whole history.
 */
export const MerchantFilterMenu = ({
  direction,
  from,
  merchants,
  onMerchantsChange,
  to,
}: MerchantFilterMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const settled = useDebouncedValue(query, MERCHANT_SETTLE_MS);

  const merchantsQuery = useQuery({
    ...orpc.budget.getMerchants.queryOptions({
      input: { direction, from, search: settled || undefined, to },
    }),
    // Nothing on the page needs this list until the menu is opened.
    enabled: isOpen,
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => {
    const found = merchantsQuery.data?.merchants ?? [];
    const listed = new Set(found.map((row) => row.name));
    const needle = foldForSearch(settled);
    // A pick that falls outside the top rows keeps its tick, so the menu never
    // contradicts the chips above the list.
    const pinned = merchants
      .filter(
        (name) => !listed.has(name) && foldForSearch(name).includes(needle)
      )
      .map((name) => ({ count: 0, name, totalMinor: 0 }));
    return [...pinned, ...found];
  }, [merchants, merchantsQuery.data, settled]);

  const isLoading = merchantsQuery.isPending && isOpen;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setQuery("");
        }
      }}
    >
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <RiStore2Line data-icon="inline-start" />
        {m.budget_filter_merchant()}
        {merchants.length > 0 && (
          <Badge variant="secondary">{merchants.length}</Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 min-w-72 overflow-y-auto"
      >
        <DropdownMenuSearch
          onChange={(event) => setQuery(event.target.value)}
          placeholder={m.budget_merchant_search_placeholder()}
          value={query}
        />
        {isLoading && (
          <div
            aria-busy="true"
            className="flex flex-col gap-1 p-1"
            data-slot="merchant-skeleton"
          >
            <output className="sr-only">{m.budget_merchant_loading()}</output>
            {SKELETON_ROWS.map((row) => (
              <Skeleton aria-hidden="true" className="h-7 w-full" key={row} />
            ))}
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <DropdownMenuEmpty>
            {merchantsQuery.isError
              ? m.budget_merchant_error()
              : m.budget_merchant_search_empty()}
          </DropdownMenuEmpty>
        )}
        {!isLoading &&
          rows.map((row) => (
            <DropdownMenuCheckboxItem
              checked={merchants.includes(row.name)}
              key={row.name}
              onCheckedChange={() =>
                onMerchantsChange(toggleMerchant(merchants, row.name))
              }
            >
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              {row.count > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {formatCurrency(row.totalMinor)}
                </span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
