import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { ChartBarIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/analysis")({
  component: AnalysisPage,
});

function AnalysisPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartBarIcon />
          </EmptyMedia>
          <EmptyTitle>Analysis is planned</EmptyTitle>
          <EmptyDescription>
            Evaluate whether your financial setup is healthy and efficient —
            coming soon.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
