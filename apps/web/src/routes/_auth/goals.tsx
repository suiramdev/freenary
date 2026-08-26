import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { TargetIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/goals")({
  component: GoalsPage,
});

function GoalsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TargetIcon />
          </EmptyMedia>
          <EmptyTitle>Goals is planned</EmptyTitle>
          <EmptyDescription>
            Define financial objectives, track progress and plan contributions —
            coming soon.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
