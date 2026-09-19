import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SettingsPage } from "@/pages/settings";

const settingsSearchSchema = z.object({ error: z.string().optional() });

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
  validateSearch: settingsSearchSchema,
});
