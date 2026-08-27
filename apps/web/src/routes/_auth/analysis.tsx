import { ChartBarIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";

const AnalysisPage = () => (
  <PlannedPage
    description="Evaluate whether your financial setup is healthy and efficient — coming soon."
    icon={ChartBarIcon}
    title="Analysis is planned"
  />
);

export const Route = createFileRoute("/_auth/analysis")({
  component: AnalysisPage,
});
