import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import {
  RiBarChartBoxLine,
  RiBrainLine,
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiQuillPenLine,
  RiToolsLine,
} from "@remixicon/react";
import type { ComponentType, ReactNode } from "react";
import { useState } from "react";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import {
  AssistantToolCall,
  assistantToolIcon,
} from "@/components/assistant/assistant-tool-call";
import type { ExecutionStep, ExecutionTrace } from "@/lib/assistant/execution";
import { toolStatusOf } from "@/lib/assistant/execution";
import { formatDuration } from "@/lib/assistant/format-duration";
import {
  durationOf,
  spanOf,
  TURN_TIMING_KEY,
} from "@/lib/assistant/use-execution-timings";
import type { ExecutionTimings } from "@/lib/assistant/use-execution-timings";
import type { ExpandAll } from "@/lib/assistant/use-expand-all";
import { useExpandAll } from "@/lib/assistant/use-expand-all";
import { m } from "@/paraglide/messages.js";

interface AssistantTraceProps {
  trace: ExecutionTrace;
  /** The answer is still being streamed. */
  live: boolean;
  timings: ExecutionTimings;
  onRetry?: () => void;
}

/** The row's label: what the step did, or does right now. */
const stepLabel = (step: ExecutionStep, live: boolean): string => {
  if (step.tools.length > 0) {
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

const stepIcon = (
  step: ExecutionStep,
  working: boolean
): ComponentType<{ className?: string }> => {
  if (working) {
    return Spinner;
  }
  if (step.tools.length === 1 && step.tools[0]) {
    return assistantToolIcon(step.tools[0]);
  }
  if (step.tools.length > 0) {
    return RiToolsLine;
  }
  if (step.answer.some((segment) => segment.kind === "chart")) {
    return RiBarChartBoxLine;
  }
  if (step.answer.length > 0) {
    return RiQuillPenLine;
  }
  return RiBrainLine;
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

/** What the thought's row reads: streaming, or done with its measured time. */
const thinkingMessage = (
  streaming: boolean,
  durationMs: number | undefined
): ReactNode => {
  if (streaming) {
    return (
      <Shimmer as="span" duration={1.5}>
        {m.assistant_thinking_streaming()}
      </Shimmer>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {m.assistant_thinking_done()}
      {durationMs !== undefined && (
        <span className="font-mono tabular-nums">
          {formatDuration(durationMs)}
        </span>
      )}
    </span>
  );
};

/** A step's lookup list: open by default, and under "Expand all" like its cards. */
const Lookups = ({
  children,
  expanded,
}: {
  children: ReactNode;
  expanded: ExpandAll | undefined;
}) => {
  const [open, setOpen] = useExpandAll(expanded, true);
  return (
    <Task onOpenChange={setOpen} open={open}>
      {children}
    </Task>
  );
};

/**
 * The steps behind an answer, as a timeline the reader can fold. It opens
 * while the assistant works and stays as it is once the answer lands; a
 * replayed answer starts folded. Every step keeps its thought and its lookups
 * inspectable.
 */
export const AssistantTrace = ({
  live,
  onRetry,
  timings,
  trace,
}: AssistantTraceProps) => {
  const [expanded, setExpanded] = useState<ExpandAll>();
  const turn = durationOf(timings.get(TURN_TIMING_KEY));

  return (
    <ChainOfThought className="max-w-none" defaultOpen={live}>
      <ChainOfThoughtHeader>
        {live ? m.assistant_trace_title_live() : m.assistant_trace_title()}
        {turn !== undefined && (
          <span className="ml-2 font-mono text-xs tabular-nums">
            {formatDuration(turn)}
          </span>
        )}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {trace.lookups > 1 && (
          <div className="flex justify-end gap-1">
            <Button
              onClick={() => setExpanded({ tick: Date.now(), value: true })}
              size="compact"
              variant="ghost"
            >
              <RiExpandUpDownLine className="size-3" />
              {m.assistant_trace_expand_all()}
            </Button>
            <Button
              onClick={() => setExpanded({ tick: Date.now(), value: false })}
              size="compact"
              variant="ghost"
            >
              <RiContractUpDownLine className="size-3" />
              {m.assistant_trace_collapse_all()}
            </Button>
          </div>
        )}
        <ol className="flex flex-col gap-3">
          {trace.steps.map((step) => {
            const previousHadTools =
              (trace.steps[step.index - 1]?.tools.length ?? 0) > 0;
            const notes = [
              ...(step.tools.length > 1
                ? [m.assistant_step_parallel({ count: step.tools.length })]
                : []),
              ...(previousHadTools
                ? [m.assistant_step_after({ step: step.index })]
                : []),
            ];
            const streaming = step.thinking?.state === "streaming";
            const thinkingMs = step.thinking
              ? spanOf(timings, step.thinking.keys)
              : undefined;

            return (
              <ChainOfThoughtStep
                description={notes.length > 0 ? notes.join(" · ") : undefined}
                icon={stepIcon(step, isWorking(step, live))}
                key={step.index}
                label={stepLabel(step, live)}
                status={step.status}
              >
                {step.thinking && (
                  <Reasoning
                    className="mb-0"
                    // Open while the thought streams and folded a moment after
                    // it ends; a replayed answer starts folded and never moves.
                    defaultOpen={live}
                    isStreaming={streaming}
                  >
                    <ReasoningTrigger
                      getThinkingMessage={(isStreaming) =>
                        thinkingMessage(isStreaming, thinkingMs)
                      }
                    />
                    <ReasoningContent>{step.thinking.text}</ReasoningContent>
                  </Reasoning>
                )}
                {step.tools.length > 0 && (
                  <Lookups expanded={expanded}>
                    <TaskTrigger
                      title={m.assistant_trace_lookups({
                        count: step.tools.length,
                      })}
                    />
                    <TaskContent>
                      {step.tools.map((tool) => (
                        <TaskItem key={tool.toolCallId}>
                          <AssistantToolCall
                            durationMs={durationOf(
                              timings.get(tool.toolCallId)
                            )}
                            expanded={expanded}
                            onRetry={onRetry}
                            part={tool}
                            status={toolStatusOf(tool, live)}
                          />
                        </TaskItem>
                      ))}
                    </TaskContent>
                  </Lookups>
                )}
              </ChainOfThoughtStep>
            );
          })}
          {trace.answerPending && (
            <ChainOfThoughtStep
              icon={RiQuillPenLine}
              label={m.assistant_step_answer_pending()}
              status="pending"
            />
          )}
        </ol>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};
