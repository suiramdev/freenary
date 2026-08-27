import { TargetIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";

const GoalsPage = () => (
  <PlannedPage
    description="Define financial objectives, track progress and plan contributions — coming soon."
    icon={TargetIcon}
    title="Goals is planned"
  />
);

export const Route = createFileRoute("/_auth/goals")({
  component: GoalsPage,
});
