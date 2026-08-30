import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/** Who a subtree is meant for; everyone else is redirected away from it. */
type Audience = "guest" | "member" | "onboarding";

interface AuthGateProps {
  audience: Audience;
  children: ReactNode;
}

/**
 * Client-side access gate. The session lives on the API's own origin, so it is
 * unreadable while the page is server-rendered — gating here keeps the routing
 * rules without holding the server-rendered shell back.
 */
export const AuthGate = ({ audience, children }: AuthGateProps) => {
  const { data: session, isPending } = authClient.useSession();
  const status = useQuery(
    orpc.onboarding.getStatus.queryOptions({ enabled: session !== null })
  );

  // Guest pages look the same to everyone, so they render straight away and
  // only bounce once a session actually turns up.
  if (audience === "guest") {
    return session === null ? children : <Navigate replace to="/" />;
  }

  if (isPending) {
    return null;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  // Onboarding status arrives alongside the page's own queries; redirecting on
  // arrival beats holding the page back for a second round trip.
  const { completed } = status.data ?? {};

  if (audience === "member") {
    // A status that could not be read is not permission to be here, and the
    // query's own error toast already says why the area stayed shut.
    if (status.isError) {
      return null;
    }
    return completed === false ? (
      <Navigate replace to="/onboarding" />
    ) : (
      children
    );
  }

  return completed === true ? <Navigate replace to="/" /> : children;
};
