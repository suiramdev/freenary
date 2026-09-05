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

    try {
      const answer = await client.auth.viewer(undefined, {
        context: { cookie },
      });

      if (answer.kind === "member") {
        return { kind: "member", onboarded: answer.onboarded };
      }

      // A guest answer only settles anything when the session cookie reaches
      // this origin; otherwise a member looks exactly like a guest from here.
      return answer.sessionCookieShared ? { kind: "guest" } : UNKNOWN_VIEWER;
    } catch {
      // The API did not answer. The browser gate still holds the rules.
      return UNKNOWN_VIEWER;
    }
  }
);
