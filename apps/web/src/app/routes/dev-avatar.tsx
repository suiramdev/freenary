import { createFileRoute } from "@tanstack/react-router";

import { BrandAvatarPage } from "@/pages/brand-avatar";

export const Route = createFileRoute("/dev-avatar")({
  component: BrandAvatarPage,
});
