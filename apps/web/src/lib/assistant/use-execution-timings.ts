import type { UIMessage } from "ai";
import { useEffect, useState } from "react";

import { isToolPart } from "./execution";

export interface Timing {
  startedAt: number;
  endedAt?: number;
}

/** Keyed by `toolCallId`, `reasoning-<part index>`, or `turn` for the whole answer. */
export type ExecutionTimings = ReadonlyMap<string, Timing>;

export const TURN_TIMING_KEY = "turn";

const isSettledTool = (state: string): boolean =>
  state === "output-available" ||
  state === "output-error" ||
  state === "output-denied";

/**
 * Wall-clock timings for the answer being streamed, measured here because the
 * stream carries none. A part's clock starts the first render it appears in
 * and stops the first render it is settled in; everything still open stops
 * when the stream does. The turn's own clock starts at `startedAt`, when the
 * question was sent, so the wait for the first token counts. A replayed
 * transcript never started a clock, so a stored answer shows no durations
 * rather than invented ones.
 */
export const useExecutionTimings = (
  parts: UIMessage["parts"],
  live: boolean,
  startedAt?: number
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
            const key = `reasoning-${index}`;
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
