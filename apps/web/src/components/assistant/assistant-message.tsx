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
  avatarState?: BrandAvatarState;
  live: boolean;
  status: ChatStatus;
  retrying: boolean;
  startedAt?: number;
  onRetry?: (messageId: string) => void;
}

const copyableProseOf = (segments: AnswerSegment[]): string =>
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
        key={`${prefix}-${index}`}
        program={segment.code}
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
  const copyable = copyableProseOf(answer);
  const hasChart = answer.some((segment) => segment.kind === "chart");
  const traced = trace.steps.some(
    (step) => step.tools.length > 0 || step.thinking !== null
  );
  const wantsFullColumn = traced || hasChart;

  return (
    <div className="flex w-full gap-3">
      <AssistantAvatar
        className="mt-0.5 size-7"
        frozen={avatarState === undefined}
        state={avatarState ?? "idle"}
      />
      <Message from="assistant">
        <MessageContent className={wantsFullColumn ? "w-full" : undefined}>
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

const AssistantMessageRow = (props: AssistantMessageProps) =>
  props.message.role === "assistant" ? (
    <AnswerMessage {...props} />
  ) : (
    <UserMessage message={props.message} />
  );

export const AssistantMessage = memo(AssistantMessageRow);
