import { BrainIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";

const AIPage = () => (
  <PlannedPage
    description="AI-assisted financial insights that reason across your entire financial model — coming soon."
    icon={BrainIcon}
    title="AI is planned"
  />
);

export const Route = createFileRoute("/_auth/ai")({
  component: AIPage,
});
