import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import {
  RiBarChartBoxLine,
  RiBrainLine,
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiFlowChart,
  RiQuillPenLine,
  RiToolsLine,
} from "@remixicon/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSteps,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  AssistantToolCall,
  assistantToolIcon,
} from "@/components/assistant/assistant-tool-call";
import type { ExecutionStep, ExecutionTrace } from "@/lib/assistant/execution";
import { toolStatusOf } from "@/lib/assistant/execution";
import { formatDuration } from "@/lib/assistant/format-duration";
import {
  durationOf,
  TURN_TIMING_KEY,
} from "@/lib/assistant/use-execution-timings";
import type { ExecutionTimings } from "@/lib/assistant/use-execution-timings";
import { m } from "@/paraglide/messages.js";

interface AssistantTraceProps {
  trace: ExecutionTrace;
  /** The answer is still being streamed. */
  live: boolean;
  timings: ExecutionTimings;
  onRetry?: () => void;
}

/** The trace stays open this long after the answer lands, then folds away. */
const SETTLE_MS = 800;

/**
 * A step's clock: its first thought or tool to its last. Undefined until
 * every one of them has stopped, and always for a replayed transcript.
 */
const stepDuration = (
  step: ExecutionStep,
  timings: ExecutionTimings
): number | undefined => {
  const keys = [
    ...step.tools.map((tool) => tool.toolCallId),
    ...(step.thinking ? [step.thinking.key] : []),
  ];
  const spans = keys.flatMap((key) => {
    const timing = timings.get(key);
    return timing?.endedAt === undefined ? [] : [timing];
  });
  if (spans.length === 0 || spans.length < keys.length) {
    return undefined;
  }
  return (
    Math.max(...spans.map((span) => span.endedAt ?? span.startedAt)) -
    Math.min(...spans.map((span) => span.startedAt))
  );
};

/** The row's label for a step that is not a single lookup. */
const stepLabel = (step: ExecutionStep, live: boolean): string => {
  if (step.tools.length > 1) {
    return m.assistant_step_lookups();
  }
  if (step.answer.length > 0) {
    if (live && step.status === "active") {
      return m.assistant_step_answer();
    }
    return step.answer.some((segment) => segment.kind === "chart")
      ? m.assistant_step_answer_chart()
      : m.assistant_step_answer_done();
  }
  return m.assistant_step_thinking();
};

const stepIcon = (step: ExecutionStep, working: boolean): ReactNode => {
  if (working) {
    return <Spinner className="size-4" />;
  }
  if (step.tools.length === 1 && step.tools[0]) {
    return assistantToolIcon(step.tools[0]);
  }
  if (step.tools.length > 0) {
    return <RiToolsLine className="size-4" />;
  }
  if (step.answer.some((segment) => segment.kind === "chart")) {
    return <RiBarChartBoxLine className="size-4" />;
  }
  if (step.answer.length > 0) {
    return <RiQuillPenLine className="size-4" />;
  }
  return <RiBrainLine className="size-4" />;
};

/**
 * One muted line under a step: how it relates to the others, and the thought
 * that opened it with its duration. Inline, so a step never nests a row.
 */
const StepNote = ({
  notes,
  thinking,
  thinkingMs,
}: {
  notes: string[];
  thinking?: ExecutionStep["thinking"];
  thinkingMs?: number;
}) => {
  if (notes.length === 0 && !thinking) {
    return null;
  }
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
      {notes.map((note) => (
        <span key={note}>{note}</span>
      ))}
      {thinking && (
        <span className="inline-flex items-center gap-1">
          <RiBrainLine className="size-3.5 shrink-0" />
          {thinking.state === "streaming" ? (
            <Shimmer as="span" duration={1.5}>
              {m.assistant_thinking_streaming()}
            </Shimmer>
          ) : (
            <span>{m.assistant_thinking_done()}</span>
          )}
          {thinkingMs !== undefined && (
            <span className="font-mono tabular-nums">
              {formatDuration(thinkingMs)}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

/** Whether the step still has something in flight. */
const isWorking = (step: ExecutionStep, live: boolean): boolean =>
  live &&
  step.status === "active" &&
  (step.thinking?.state === "streaming" ||
    step.tools.some(
      (tool) =>
        toolStatusOf(tool, live) !== "completed" &&
        toolStatusOf(tool, live) !== "failed"
    ) ||
    step.answer.length > 0);

/**
 * The steps behind an answer, as a timeline the reader can fold away. It is
 * open while the assistant works and folds once the answer lands, so the
 * answer is what the reader looks at; every step stays inspectable.
 */
export const AssistantTrace = ({
  live,
  onRetry,
  timings,
  trace,
}: AssistantTraceProps) => {
  const [open, setOpen] = useState(live);
  const [expanded, setExpanded] = useState<{ tick: number; value: boolean }>();
  const userToggled = useRef(false);

  // Folds once the answer lands. A stopped or failed turn has no answer to
  // give the focus to, and a failed lookup must stay in view, so those stay
  // open.
  const answered =
    trace.steps.some((step) => step.answer.length > 0) &&
    !trace.steps.some((step) =>
      step.tools.some((tool) => tool.state === "output-error")
    );
  useEffect(() => {
    if (live || !answered || userToggled.current) {
      return;
    }
    const timer = window.setTimeout(() => setOpen(false), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [live, answered]);

  const turn = durationOf(timings.get(TURN_TIMING_KEY));
  const summary = [
    m.assistant_trace_steps({ count: trace.steps.length }),
    ...(trace.lookups > 0
      ? [m.assistant_trace_lookups({ count: trace.lookups })]
      : []),
    ...(turn === undefined ? [] : [formatDuration(turn)]),
  ].join(" · ");

  const steps = trace.steps.map((step) => {
    const previousHadTools = trace.steps[step.index - 1]?.tools.length ?? 0;
    const notes = [
      ...(step.tools.length > 1
        ? [m.assistant_step_parallel({ count: step.tools.length })]
        : []),
      ...(previousHadTools > 0
        ? [m.assistant_step_after({ step: step.index })]
        : []),
    ];
    // A step that has only thought so far is labelled "Thinking" already; the
    // note names the thought once the step has done something with it.
    const thinking =
      step.tools.length > 0 || step.answer.length > 0
        ? step.thinking
        : undefined;
    const note = (
      <StepNote
        notes={notes}
        thinking={thinking}
        thinkingMs={
          thinking ? durationOf(timings.get(thinking.key)) : undefined
        }
      />
    );
    const tools = step.tools.map((tool) => ({
      durationMs: durationOf(timings.get(tool.toolCallId)),
      status: toolStatusOf(tool, live),
      tool,
    }));

    return {
      duration: stepDuration(step, timings),
      note,
      step,
      tools,
      working: isWorking(step, live),
    };
  });

  const last = trace.answerPending ? undefined : steps.length - 1;

  return (
    <ChainOfThought
      onOpenChange={(next) => {
        userToggled.current = true;
        setOpen(next);
      }}
      open={open}
    >
      <ChainOfThoughtHeader
        icon={<RiFlowChart className="size-4" />}
        meta={summary}
      >
        {live ? m.assistant_trace_title_live() : m.assistant_trace_title()}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {trace.lookups > 1 && (
          <div className="mt-2 flex justify-end gap-1">
            <Button
              onClick={() => setExpanded({ tick: Date.now(), value: true })}
              size="xs"
              variant="ghost"
            >
              <RiExpandUpDownLine className="size-3" />
              {m.assistant_trace_expand_all()}
            </Button>
            <Button
              onClick={() => setExpanded({ tick: Date.now(), value: false })}
              size="xs"
              variant="ghost"
            >
              <RiContractUpDownLine className="size-3" />
              {m.assistant_trace_collapse_all()}
            </Button>
          </div>
        )}
        <ChainOfThoughtSteps>
          {steps.map(({ duration, note, step, tools, working }, index) => {
            const only = tools.length === 1 ? tools[0] : undefined;
            return (
              <ChainOfThoughtStep
                icon={stepIcon(step, working)}
                key={step.index}
                label={only ? undefined : stepLabel(step, live)}
                last={index === last}
                meta={
                  only || duration === undefined
                    ? undefined
                    : formatDuration(duration)
                }
                status={step.status}
              >
                {only ? (
                  // A step that made one lookup is that lookup: one row, not
                  // a label over a card that repeats it.
                  <AssistantToolCall
                    durationMs={only.durationMs}
                    expanded={expanded}
                    onRetry={onRetry}
                    part={only.tool}
                    status={only.status}
                  >
                    {note}
                  </AssistantToolCall>
                ) : (
                  <>
                    {note}
                    {tools.map(({ durationMs, status, tool }) => (
                      <AssistantToolCall
                        durationMs={durationMs}
                        expanded={expanded}
                        key={tool.toolCallId}
                        onRetry={onRetry}
                        part={tool}
                        status={status}
                      />
                    ))}
                  </>
                )}
              </ChainOfThoughtStep>
            );
          })}
          {trace.answerPending && (
            <ChainOfThoughtStep
              icon={<RiQuillPenLine className="size-4" />}
              label={m.assistant_step_answer_pending()}
              last
              status="pending"
            />
          )}
        </ChainOfThoughtSteps>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};
