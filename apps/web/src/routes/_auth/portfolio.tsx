import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { WalletIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

const PortfolioPage = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty className="border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletIcon />
        </EmptyMedia>
        <EmptyTitle>Portfolio is planned</EmptyTitle>
        <EmptyDescription>
          Track your holdings, accounts and net worth across all your
          connections — coming soon.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);

export const Route = createFileRoute("/_auth/portfolio")({
  component: PortfolioPage,
});
