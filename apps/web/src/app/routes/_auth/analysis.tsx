import { createFileRoute } from "@tanstack/react-router";

import { AnalysisPage } from "@/pages/analysis";

export const Route = createFileRoute("/_auth/analysis")({
  component: AnalysisPage,
});
