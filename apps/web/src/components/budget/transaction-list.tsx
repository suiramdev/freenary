import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@freenary/ui/components/tabs";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { TransactionRows } from "@/components/budget/transaction-rows";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TimeRange } from "@/lib/budget/period";
import type { Transaction } from "@/lib/budget/transaction";

export const TransactionList = ({
  transactions,
  totals,
  direction,
  onDirectionChange,
  search,
  onSearchChange,
  hasMore,
  onLoadMore,
  isLoading,
  onTransactionClick,
  range,
}: {
  transactions: Transaction[];
  totals: { incoming: number; outgoing: number };
  direction: "incoming" | "outgoing";
  onDirectionChange: (dir: "incoming" | "outgoing") => void;
  search: string;
  onSearchChange: (search: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  const outgoingLabel = `Outgoing · ${formatCurrency(Math.abs(totals.outgoing), "EUR")}`;
  const incomingLabel = `Incoming · ${formatCurrency(totals.incoming, "EUR")}`;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <InputGroup>
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          type="search"
        />
      </InputGroup>
      <Tabs
        value={direction}
        // SAFETY: TabsTrigger values are constrained to "incoming" | "outgoing"
        onValueChange={(v) => onDirectionChange(v as "incoming" | "outgoing")}
        className="flex flex-1 flex-col"
      >
        <TabsList variant="line">
          <TabsTrigger value="outgoing">{outgoingLabel}</TabsTrigger>
          <TabsTrigger value="incoming">{incomingLabel}</TabsTrigger>
        </TabsList>
        <TabsContent value="outgoing" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={false}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabsContent>
        <TabsContent value="incoming" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={true}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
