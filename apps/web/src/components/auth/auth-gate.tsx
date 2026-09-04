import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/** Who a subtree is meant for; everyone else is redirected away from it. */
type Audience = "guest" | "member" | "onboarding";

type Destination = "/" | "/login" | "/onboarding";

interface AuthGateProps {
  audience: Audience;
  children: ReactNode;
}

interface Visitor {
  /** `undefined` until the onboarding status has been read. */
  completed: boolean | undefined;
  isPending: boolean;
  isSignedIn: boolean;
}

/** Where the visitor belongs instead of here, or `null` if here is right. */
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
  // Onboarding status arrives alongside the page's own queries; redirecting on
  // arrival beats holding the page back for a second round trip.
  if (audience === "member") {
    return completed === false ? "/onboarding" : null;
  }
  return completed === true ? "/" : null;
};

/**
 * The live access gate. The server answers who the visitor is once per page
 * load and the routes redirect on it; from then on the session is the
 * browser's — it signs in, signs out and expires here — so this is what holds
 * the routing rules between page loads.
 */
export const AuthGate = ({ audience, children }: AuthGateProps) => {
  // Selected, so router state ticks that leave the viewer alone do not
  // re-render the gate.
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

  // Navigated from an effect keyed on the destination, not from a `<Navigate>`
  // in the tree: that component navigates again on every render, and the
  // layout above re-renders while a navigation is pending — which would
  // restart the navigation until it never lands.
  useEffect(() => {
    if (destination !== null) {
      void navigate({ replace: true, to: destination });
    }
  }, [destination, navigate]);

  if (destination !== null) {
    return null;
  }

  // Guest pages look the same to everyone, so they render straight away and
  // only bounce once a session actually turns up.
  if (audience === "guest") {
    return children;
  }

  // A signed-in page is only ever server-rendered for a member, so the
  // server's answer stands until the browser has its own. Without one — the
  // cookie never reached the server — nothing shows yet.
  if (isPending) {
    return viewer.kind === "member" ? children : null;
  }

  // A status that could not be read is not permission to be here, and the
  // query's own error toast already says why the area stayed shut.
  if (audience === "member" && status.isError) {
    return null;
  }

  return children;
};
