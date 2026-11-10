import { ChartBar } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { PlannedPage } from "@/shared/ui/planned-page";

export const AnalysisPage = () => (
  <PlannedPage
    description={m.shell_planned_analysis_description()}
    color={CHART_COLOR_VARS.orange}
    icon={ChartBar}
    title={m.shell_planned_title({ page: m.nav_analysis() })}
  />
);
