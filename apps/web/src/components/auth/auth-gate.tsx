import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type Audience = "guest" | "member" | "onboarding";

type Destination = "/" | "/login" | "/onboarding";

interface AuthGateProps {
  audience: Audience;
  children: ReactNode;
}

interface Visitor {
  completed: boolean | undefined;
  isPending: boolean;
  isSignedIn: boolean;
}

const redirectFor = (
  audience: Audience,
  { completed, isPending, isSignedIn }: Visitor
): Destination | null => {
  if (audience === "guest") {
    return isSignedIn ? "/" : null;
  }

  if (isPending) {
    return null;
  }

  if (!isSignedIn) {
    return "/login";
  }

  if (audience === "member") {
    return completed === false ? "/onboarding" : null;
  }

  return completed === true ? "/" : null;
};

export const AuthGate = ({ audience, children }: AuthGateProps) => {
  const viewer = useRouteContext({
    from: "__root__",
    select: (context) => context.viewer,
  });
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const status = useQuery(
    orpc.onboarding.getStatus.queryOptions({ enabled: session !== null })
  );

  const destination = redirectFor(audience, {
    completed: status.data?.completed,
    isPending,
    isSignedIn: session !== null,
  });

  useEffect(() => {
    if (destination !== null) {
      void navigate({ replace: true, to: destination });
    }
  }, [destination, navigate]);

  if (destination !== null) {
    return null;
  }

  const isPublicToEveryone = audience === "guest";

  if (isPublicToEveryone) {
    return children;
  }

  const wasServerRenderedForMember = viewer.kind === "member";

  if (isPending) {
    return wasServerRenderedForMember ? children : null;
  }

  const isOnboardingStatusUnreadable = audience === "member" && status.isError;

  if (isOnboardingStatusUnreadable) {
    return null;
  }

  return children;
};
