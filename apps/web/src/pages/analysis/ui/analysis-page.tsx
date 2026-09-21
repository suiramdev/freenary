import { RiBarChartLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { PlannedPage } from "@/shared/ui/planned-page";

export const AnalysisPage = () => (
  <PlannedPage
    description={m.shell_planned_analysis_description()}
    icon={RiBarChartLine}
    title={m.shell_planned_title({ page: m.nav_analysis() })}
  />
);
