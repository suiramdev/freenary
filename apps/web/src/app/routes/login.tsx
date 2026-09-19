import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { LoginPage } from "@/pages/login";

const loginSearchSchema = z.object({ error: z.string().optional() });

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context: { viewer } }) => {
    if (viewer.kind === "member") {
      throw redirect({ to: viewer.onboarded ? "/" : "/onboarding" });
    }
  },
  component: LoginPage,
  validateSearch: loginSearchSchema,
});
