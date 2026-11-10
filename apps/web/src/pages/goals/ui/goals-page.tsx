import { Target } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { PlannedPage } from "@/shared/ui/planned-page";

export const GoalsPage = () => (
  <PlannedPage
    description={m.shell_planned_goals_description()}
    color={CHART_COLOR_VARS.red}
    icon={Target}
    title={m.shell_planned_title({ page: m.nav_goals() })}
  />
);
