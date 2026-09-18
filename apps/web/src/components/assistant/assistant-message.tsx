import { Button } from "@freenary/ui/components/button";
import { Tooltip } from "@freenary/ui/components/tooltip";
import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { useSize } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";
import { RiFileCopyLine, RiRefreshLine } from "@remixicon/react";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { memo } from "react";

import { AssistantActivity } from "@/components/assistant/assistant-activity";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { AssistantChart } from "@/components/assistant/assistant-chart";
import { AssistantProse } from "@/components/assistant/assistant-prose";
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

const bubblePad = { compact: "px-3 py-2", default: "px-4 py-3" } as const;

const textOf = (segments: AnswerSegment[]): string =>
  segments
    .flatMap((segment) => (segment.kind === "markdown" ? [segment.text] : []))
    .join("\n\n");

const AnswerSegments = ({
  prefix,
  segments,
}: {
  prefix: string;
  segments: AnswerSegment[];
}) =>
  segments.map((segment, index) =>
    segment.kind === "markdown" ? (
      <AssistantProse className="w-full" key={`${prefix}-${index}`}>
        {segment.text}
      </AssistantProse>
    ) : (
      <AssistantChart
        key={`${prefix}-${index}`}
        program={segment.code}
        streaming={!segment.closed}
      />
    )
  );

const AnswerAction = ({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <Tooltip content={label}>
    <Button
      aria-label={label}
      onClick={onClick}
      size="icon-compact"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  </Tooltip>
);

const UserMessage = ({ message }: { message: UIMessage }) => {
  const size = useSize();
  const text = message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n");

  return (
    <div className="flex w-full justify-end">
      <div
        className={cn(
          "bg-secondary text-foreground max-w-[85%] min-w-0 rounded-lg text-sm break-words whitespace-pre-wrap",
          bubblePad[size.variant]
        )}
      >
        {text}
      </div>
    </div>
  );
};

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
      <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {traced && (
          <AssistantTrace
            live={live}
            onRetry={retry}
            timings={timings}
            trace={trace}
          />
        )}
        <AnswerSegments prefix={message.id} segments={answer} />
        {live && (
          <AssistantActivity
            activity={activityOf(trace, status)}
            retrying={retrying}
          />
        )}
        {!live && copyable.length > 0 && (
          <div className="flex items-center gap-1">
            <AnswerAction
              label={m.assistant_copy()}
              onClick={() => navigator.clipboard.writeText(copyable)}
            >
              <RiFileCopyLine />
            </AnswerAction>
            {retry && (
              <AnswerAction label={m.assistant_retry()} onClick={retry}>
                <RiRefreshLine />
              </AnswerAction>
            )}
          </div>
        )}
      </div>
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
