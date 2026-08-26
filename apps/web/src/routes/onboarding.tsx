import { createFileRoute, redirect } from "@tanstack/react-router";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const status = await client.onboarding.getStatus();
    if (status.completed) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingWizard,
});
