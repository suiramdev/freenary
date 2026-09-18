import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Data, Effect } from "effect";

import { client } from "@/utils/orpc";

export type Viewer =
  | { kind: "guest" }
  | { kind: "member"; onboarded: boolean }
  | { kind: "unknown" };

export const UNKNOWN_VIEWER: Viewer = { kind: "unknown" };

class ViewerRequestFailed extends Data.TaggedError("ViewerRequestFailed")<{
  readonly cause: unknown;
}> {}

const resolveViewer = (cookie: string | undefined) =>
  Effect.tryPromise({
    catch: (cause) => new ViewerRequestFailed({ cause }),
    try: () => client.auth.viewer(undefined, { context: { cookie } }),
  }).pipe(
    Effect.map((answer): Viewer => {
      if (answer.kind === "member") {
        return { kind: "member", onboarded: answer.onboarded };
      }

      return answer.sessionCookieShared ? { kind: "guest" } : UNKNOWN_VIEWER;
    }),
    Effect.catchTag("ViewerRequestFailed", () => Effect.succeed(UNKNOWN_VIEWER))
  );

export const getViewer = createServerFn({ method: "GET" }).handler(
  (): Promise<Viewer> =>
    Effect.runPromise(resolveViewer(getRequestHeader("cookie")))
);
