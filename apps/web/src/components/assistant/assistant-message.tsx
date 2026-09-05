import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { RiFileCopyLine, RiRefreshLine } from "@remixicon/react";
import type { UIMessage } from "ai";
import { memo } from "react";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { AssistantActivity } from "@/components/assistant/assistant-activity";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { AssistantChart } from "@/components/assistant/assistant-chart";
import { AssistantTrace } from "@/components/assistant/assistant-trace";
import type { AnswerSegment } from "@/lib/assistant/answer-segments";
import { activityOf, traceOf } from "@/lib/assistant/execution";
import type { ChatStatus } from "@/lib/assistant/execution";
import { useExecutionTimings } from "@/lib/assistant/use-execution-timings";
import { m } from "@/paraglide/messages.js";

interface AssistantMessageProps {
  message: UIMessage;
  /** The live agent state, passed only to the turn currently being answered. */
  avatarState?: BrandAvatarState;
  /** This answer is the one being streamed right now. */
  live: boolean;
  status: ChatStatus;
  /** The live answer replaces the last one, so its first wait says so. */
  retrying: boolean;
  /** When the question was sent, so the whole turn can be timed. */
  startedAt?: number;
  /** Redo this turn. Takes the id so the chat can pass one stable callback. */
  onRetry?: (messageId: string) => void;
}

/** The prose only: a copied answer should paste as text, not as a program. */
const textOf = (segments: AnswerSegment[]): string =>
  segments
    .flatMap((segment) => (segment.kind === "markdown" ? [segment.text] : []))
    .join("\n\n");

const AnswerSegments = ({
  live,
  prefix,
  segments,
}: {
  live: boolean;
  prefix: string;
  segments: AnswerSegment[];
}) =>
  segments.map((segment, index) =>
    segment.kind === "markdown" ? (
      <MessageResponse
        className="h-auto w-full"
        isAnimating={live}
        key={`${prefix}-${index}`}
      >
        {segment.text}
      </MessageResponse>
    ) : (
      <AssistantChart
        code={segment.code}
        key={`${prefix}-${index}`}
        streaming={!segment.closed}
      />
    )
  );

const UserMessage = ({ message }: { message: UIMessage }) => (
  <div className="flex w-full gap-3">
    <Message from="user">
      <MessageContent>
        {message.parts.map((part, index) =>
          part.type === "text" ? (
            <MessageResponse key={`${message.id}-${index}`}>
              {part.text}
            </MessageResponse>
          ) : null
        )}
      </MessageContent>
    </Message>
  </div>
);

/**
 * One answer: the trace of how it was reached, then the answer itself. The
 * trace is what moves while the assistant works; once the answer lands it
 * folds, and the prose and the chart are what the reader looks at.
 */
const AnswerMessage = ({
  avatarState,
  live,
  message,
  onRetry,
  retrying,
  startedAt,
  status,
}: AssistantMessageProps) => {
  const retry = onRetry ? () => onRetry(message.id) : undefined;
  const trace = traceOf(message.parts, live);
  const timings = useExecutionTimings(message.parts, live, startedAt);
  const answer = trace.steps.flatMap((step) => step.answer);
  const copyable = textOf(answer);
  const hasChart = answer.some((segment) => segment.kind === "chart");
  // A plain answer with no lookup and no thought has no trace worth a row.
  const traced = trace.steps.some(
    (step) => step.tools.length > 0 || step.thinking !== null
  );

  return (
    <div className="flex w-full gap-3">
      <AssistantAvatar
        className="mt-0.5 size-7"
        frozen={avatarState === undefined}
        state={avatarState ?? "idle"}
      />
      <Message from="assistant">
        {/* The content box hugs its prose; a trace or a chart wants the column. */}
        <MessageContent className={traced || hasChart ? "w-full" : undefined}>
          {traced && (
            <AssistantTrace
              live={live}
              onRetry={retry}
              timings={timings}
              trace={trace}
            />
          )}
          <AnswerSegments live={live} prefix={message.id} segments={answer} />
          {live && (
            <AssistantActivity
              activity={activityOf(trace, status)}
              retrying={retrying}
            />
          )}
        </MessageContent>
        {!live && copyable.length > 0 && (
          <MessageActions>
            <MessageAction
              label={m.assistant_copy()}
              onClick={() => navigator.clipboard.writeText(copyable)}
              tooltip={m.assistant_copy()}
            >
              <RiFileCopyLine className="size-3" />
            </MessageAction>
            {retry && (
              <MessageAction
                label={m.assistant_retry()}
                onClick={retry}
                tooltip={m.assistant_retry()}
              >
                <RiRefreshLine className="size-3" />
              </MessageAction>
            )}
          </MessageActions>
        )}
      </Message>
    </div>
  );
};

/**
 * Memoised: a streamed chunk re-renders the chat, and a settled answer with a
 * chart must not re-render its chart on every one. `useChat` keeps settled
 * message objects stable, and the chat passes settled rows stable props.
 */
const AssistantMessageRow = (props: AssistantMessageProps) =>
  props.message.role === "assistant" ? (
    <AnswerMessage {...props} />
  ) : (
    <UserMessage message={props.message} />
  );

export const AssistantMessage = memo(AssistantMessageRow);
