import type { ToolUIPart, UIMessage } from "ai";

import { splitAnswer } from "./answer-segments";
import type { AnswerSegment } from "./answer-segments";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/**
 * The SDK's tool states as the reader sees them. `cancelled` is not a state
 * the SDK ever writes: it is a call still waiting when the stream ended,
 * because the reader pressed Stop or the connection dropped.
 */
export type ToolStatus =
  | "preparing"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus = "complete" | "active" | "pending";

/** One model call: what it thought, what it called, what it wrote. */
export interface ExecutionStep {
  index: number;
  /**
   * Reasoning parts were present; `"streaming"` while the last one still is.
   * `key` is the timing key the timings hook uses for that part.
   */
  thinking: { state: "streaming" | "done"; key: string } | null;
  tools: ToolUIPart[];
  answer: AnswerSegment[];
  status: StepStatus;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  /** Tools ran, nothing was written yet, and the stream is still open. */
  answerPending: boolean;
  lookups: number;
}

/**
 * What the assistant is doing right now, for a status line. `null` once the
 * answer is complete. `tool` names the lookup when one is in flight.
 */
export type Activity =
  | { kind: "thinking" }
  | { kind: "preparing"; tool: ToolUIPart }
  | { kind: "running"; tool: ToolUIPart; parallel: number }
  | { kind: "writing" }
  | { kind: "drawing" }
  | null;

/** Every tool part's type is `tool-<name>`, which no built-in narrowing sees. */
export const isToolPart = (
  part: UIMessage["parts"][number]
): part is ToolUIPart => part.type.startsWith("tool-");

export const toolStatusOf = (part: ToolUIPart, live: boolean): ToolStatus => {
  switch (part.state) {
    case "input-streaming":
    case "approval-requested": {
      return live ? "preparing" : "cancelled";
    }
    case "input-available":
    case "approval-responded": {
      return live ? "running" : "cancelled";
    }
    case "output-available": {
      return "completed";
    }
    case "output-denied": {
      return "cancelled";
    }
    default: {
      return "failed";
    }
  }
};

const newStep = (index: number): ExecutionStep => ({
  answer: [],
  index,
  status: "complete",
  thinking: null,
  tools: [],
});

/**
 * Groups a message's parts by the `step-start` markers the SDK writes for
 * every model call. Within a step, tool calls ran concurrently; across
 * steps, each call fed the next.
 */
export const traceOf = (
  parts: UIMessage["parts"],
  live: boolean
): ExecutionTrace => {
  const steps: ExecutionStep[] = [];
  let current: ExecutionStep | undefined;

  for (const [index, part] of parts.entries()) {
    if (part.type === "step-start") {
      current = newStep(steps.length);
      steps.push(current);
      continue;
    }

    if (!current) {
      current = newStep(0);
      steps.push(current);
    }

    if (part.type === "reasoning") {
      current.thinking = {
        key: `reasoning-${index}`,
        state: live && part.state === "streaming" ? "streaming" : "done",
      };
    } else if (isToolPart(part)) {
      current.tools.push(part);
    } else if (part.type === "text") {
      current.answer.push(...splitAnswer(part.text));
    }
  }

  const last = steps.at(-1);
  if (last && live) {
    last.status = "active";
  }

  return {
    answerPending:
      live &&
      last !== undefined &&
      last.tools.length > 0 &&
      last.answer.length === 0,
    lookups: steps.reduce((sum, step) => sum + step.tools.length, 0),
    steps,
  };
};

export const activityOf = (
  trace: ExecutionTrace,
  status: ChatStatus
): Activity => {
  if (status === "submitted") {
    return { kind: "thinking" };
  }

  if (status !== "streaming") {
    return null;
  }

  const step = trace.steps.at(-1);
  if (!step) {
    return { kind: "thinking" };
  }

  const preparing = step.tools.find((tool) => tool.state === "input-streaming");
  if (preparing) {
    return { kind: "preparing", tool: preparing };
  }

  const running = step.tools.filter((tool) => tool.state === "input-available");
  const [first] = running;
  if (first) {
    return { kind: "running", parallel: running.length, tool: first };
  }

  if (
    step.answer.some((segment) => segment.kind === "chart" && !segment.closed)
  ) {
    return { kind: "drawing" };
  }

  if (step.answer.length > 0) {
    return { kind: "writing" };
  }

  return { kind: "thinking" };
};
