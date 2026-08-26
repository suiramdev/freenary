import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { BrainIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/ai")({
  component: AIPage,
});

function AIPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BrainIcon />
          </EmptyMedia>
          <EmptyTitle>AI is planned</EmptyTitle>
          <EmptyDescription>
            AI-assisted financial insights that reason across your entire
            financial model — coming soon.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
