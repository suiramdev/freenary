import type { UIMessage } from "ai";
import { useEffect, useState } from "react";

import { isToolPart, reasoningTimingKey } from "./execution";

export interface Timing {
  startedAt: number;
  endedAt?: number;
}

export type ExecutionTimings = ReadonlyMap<string, Timing>;

export const TURN_TIMING_KEY = "turn";

const isSettledTool = (state: string): boolean =>
  state === "output-available" ||
  state === "output-error" ||
  state === "output-denied";

export const useExecutionTimings = (
  parts: UIMessage["parts"],
  live: boolean,
  startedAt: number | undefined
): ExecutionTimings => {
  const [timings, setTimings] = useState<Map<string, Timing>>(() => new Map());

  useEffect(() => {
    const now = Date.now();

    // eslint-disable-next-line react/set-state-in-effect -- the clock is the external system: a chunk's arrival time exists only when the effect runs
    setTimings((previous) => {
      const next = new Map(previous);
      let changed = false;

      const open = (key: string, at = now) => {
        if (!next.has(key)) {
          next.set(key, { startedAt: at });
          changed = true;
        }
      };

      const close = (key: string) => {
        const timing = next.get(key);

        if (timing && timing.endedAt === undefined) {
          next.set(key, { ...timing, endedAt: now });
          changed = true;
        }
      };

      if (live) {
        open(TURN_TIMING_KEY, startedAt ?? now);

        for (const [index, part] of parts.entries()) {
          if (isToolPart(part)) {
            open(part.toolCallId);

            if (isSettledTool(part.state)) {
              close(part.toolCallId);
            }
          } else if (part.type === "reasoning") {
            const key = reasoningTimingKey(index);
            open(key);

            if (part.state !== "streaming") {
              close(key);
            }
          }
        }
      } else {
        for (const key of next.keys()) {
          close(key);
        }
      }

      return changed ? next : previous;
    });
  }, [parts, live, startedAt]);

  return timings;
};

export const durationOf = (timing: Timing | undefined): number | undefined =>
  timing?.endedAt === undefined ? undefined : timing.endedAt - timing.startedAt;

export const spanOf = (
  timings: ExecutionTimings,
  keys: string[]
): number | undefined => {
  const ended = keys.flatMap((key) => {
    const timing = timings.get(key);

    return timing?.endedAt === undefined
      ? []
      : [{ ...timing, endedAt: timing.endedAt }];
  });

  if (ended.length === 0 || ended.length < keys.length) {
    return undefined;
  }

  return (
    Math.max(...ended.map((timing) => timing.endedAt)) -
    Math.min(...ended.map((timing) => timing.startedAt))
  );
};
