import { ChartBarIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";
import { m } from "@/paraglide/messages.js";

const AnalysisPage = () => (
  <PlannedPage
    description={m.shell_planned_analysis_description()}
    icon={ChartBarIcon}
    title={m.shell_planned_title({ page: m.nav_analysis() })}
  />
);

export const Route = createFileRoute("/_auth/analysis")({
  component: AnalysisPage,
});
