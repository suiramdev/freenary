import { RiTargetLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { PlannedPage } from "@/shared/ui/planned-page";

export const GoalsPage = () => (
  <PlannedPage
    description={m.shell_planned_goals_description()}
    icon={RiTargetLine}
    title={m.shell_planned_title({ page: m.nav_goals() })}
  />
);
