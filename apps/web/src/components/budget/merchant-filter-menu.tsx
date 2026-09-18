import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  comboboxItemValue,
} from "@freenary/ui/components/combobox";
import type { ComboboxItemData } from "@freenary/ui/components/combobox";
import { RiStore2Line } from "@remixicon/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TransactionDirection } from "@/lib/budget/search";
import { remixIcon } from "@/lib/remix-icon";
import { foldForSearch } from "@/lib/search-text";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

interface MerchantFilterMenuProps {
  direction: TransactionDirection;
  from: Date;
  merchants: string[];
  onMerchantsChange: (merchants: string[]) => void;
  to: Date;
}

const MERCHANT_SETTLE_MS = 250;

const KEEP_EVERY_ROW = () => true;

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
    enabled: isOpen,
    placeholderData: keepPreviousData,
  });

  const totals = useMemo(() => {
    const byName: Record<string, string> = {};

    for (const row of merchantsQuery.data?.merchants ?? []) {
      if (row.count > 0) {
        byName[row.name] = formatCurrency(row.totalMinor);
      }
    }

    return byName;
  }, [merchantsQuery.data]);

  const items = useMemo<ComboboxItemData[]>(() => {
    const found = merchantsQuery.data?.merchants ?? [];
    const listed = new Set(found.map((row) => row.name));
    const needle = foldForSearch(settled);
    const pinned = merchants.filter(
      (name) => !listed.has(name) && foldForSearch(name).includes(needle)
    );

    return [...pinned, ...found.map((row) => row.name)].map((name) => ({
      label: name,
      value: name,
    }));
  }, [merchants, merchantsQuery.data, settled]);

  const emptyMessageOf = () => {
    if (merchantsQuery.isPending) {
      return m.budget_merchant_loading();
    }

    return merchantsQuery.isError
      ? m.budget_merchant_error()
      : m.budget_merchant_search_empty();
  };

  return (
    <Combobox
      filter={KEEP_EVERY_ROW}
      items={items}
      multiple
      onOpenChange={(open) => {
        setIsOpen(open);

        if (!open) {
          setQuery("");
        }
      }}
      onQueryChange={setQuery}
      onValueChange={onMerchantsChange}
      value={merchants}
    >
      <ComboboxChips
        className="min-w-52"
        clearable
        icon={remixIcon(RiStore2Line)}
        placeholder={m.budget_filter_merchant()}
      />
      <ComboboxContent align="start">
        <ComboboxEmpty>{emptyMessageOf()}</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            const name = comboboxItemValue(item);

            return (
              <ComboboxItem value={name}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="truncate">{name}</span>
                  {totals[name] && (
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {totals[name]}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
