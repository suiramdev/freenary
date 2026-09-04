import { ORPCError } from "@orpc/client";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { client } from "@/utils/orpc";

/**
 * Who a page is being rendered for, as the server worked it out from the
 * request's cookies before the first byte. Routes redirect on it, so a visitor
 * lands on the page that is theirs instead of on one that then bounces.
 */
export type Viewer =
  | { kind: "guest" }
  | { kind: "member"; onboarded: boolean }
  /**
   * No answer: the session cookie never reaches this origin, the API did not
   * reply, or the page is being navigated to in the browser — where the live
   * session is the browser's to hold and `AuthGate` routes on it.
   */
  | { kind: "unknown" };

export const UNKNOWN_VIEWER: Viewer = { kind: "unknown" };

export const getViewer = createServerFn({ method: "GET" }).handler(
  async (): Promise<Viewer> => {
    const cookie = getRequestHeader("cookie");

    // Both at once: a status settles a member, and the capabilities settle
    // whether a refusal means a guest or a cookie this origin never receives.
    const [capabilities, status] = await Promise.allSettled([
      client.auth.capabilities(),
      client.onboarding.getStatus(undefined, { context: { cookie } }),
    ]);

    if (status.status === "fulfilled") {
      return { kind: "member", onboarded: status.value.completed };
    }

    const isRefused =
      status.reason instanceof ORPCError &&
      status.reason.code === "UNAUTHORIZED";
    const isCookieShared =
      capabilities.status === "fulfilled" &&
      capabilities.value.sessionCookieShared;

    return isRefused && isCookieShared ? { kind: "guest" } : UNKNOWN_VIEWER;
  }
);
