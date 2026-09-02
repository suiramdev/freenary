import { RiBrainLine } from "@remixicon/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";
import { m } from "@/paraglide/messages.js";

const AIPage = () => (
  <PlannedPage
    description={m.shell_planned_ai_description()}
    icon={RiBrainLine}
    title={m.shell_planned_title({ page: m.nav_ai() })}
  />
);

export const Route = createFileRoute("/_auth/ai")({
  component: AIPage,
});
