import { RiTargetLine } from "@remixicon/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";
import { m } from "@/paraglide/messages.js";

const GoalsPage = () => (
  <PlannedPage
    description={m.shell_planned_goals_description()}
    icon={RiTargetLine}
    title={m.shell_planned_title({ page: m.nav_goals() })}
  />
);

export const Route = createFileRoute("/_auth/goals")({
  component: GoalsPage,
});
