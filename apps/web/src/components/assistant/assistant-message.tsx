import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { RiFileCopyLine, RiRefreshLine } from "@remixicon/react";
import type { ToolUIPart, UIMessage } from "ai";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { AssistantChart } from "@/components/assistant/assistant-chart";
import { AssistantToolCall } from "@/components/assistant/assistant-tool-call";
import { splitAnswer } from "@/lib/assistant/answer-segments";
import type { AnswerSegment } from "@/lib/assistant/answer-segments";
import { m } from "@/paraglide/messages.js";

interface AssistantMessageProps {
  message: UIMessage;
  /** The live agent state, passed only to the turn currently being answered. */
  avatarState?: BrandAvatarState;
  onRetry?: () => void;
}

/** A text part, split into prose and charts; every other part as it came. */
type Segmented = AnswerSegment[] | UIMessage["parts"][number];

/**
 * The assistant's text parts split once per render; every other part, and a
 * user's own text, pass through. Only the model writes charts.
 */
const segmentsOf = (message: UIMessage): Segmented[] =>
  message.parts.map((part) =>
    part.type === "text" && message.role === "assistant"
      ? splitAnswer(part.text)
      : part
  );

const isSegments = (entry: Segmented): entry is AnswerSegment[] =>
  Array.isArray(entry);

/** The prose only: a copied answer should paste as text, not as a program. */
const textOf = (entries: Segmented[]): string =>
  entries
    .flatMap((entry) => (isSegments(entry) ? entry : []))
    .flatMap((segment) => (segment.kind === "markdown" ? [segment.text] : []))
    .join("\n\n");

/** Every tool part's type is `tool-<name>`, which no built-in narrowing sees. */
const isToolPart = (part: UIMessage["parts"][number]): part is ToolUIPart =>
  part.type.startsWith("tool-");

export const AssistantMessage = ({
  avatarState,
  message,
  onRetry,
}: AssistantMessageProps) => {
  const isAssistant = message.role === "assistant";
  const entries = segmentsOf(message);
  const copyable = textOf(entries);
  // The content box hugs its prose; a chart wants the whole column instead.
  const hasChart = entries.some(
    (entry) =>
      isSegments(entry) && entry.some((segment) => segment.kind === "chart")
  );

  return (
    <div className="flex w-full gap-3">
      {isAssistant && (
        <AssistantAvatar
          className="mt-0.5 size-7"
          frozen={avatarState === undefined}
          state={avatarState ?? "idle"}
        />
      )}
      <Message from={message.role}>
        <MessageContent className={hasChart ? "w-full" : undefined}>
          {entries.map((entry, index) => {
            const key = `${message.id}-${index}`;

            if (isSegments(entry)) {
              return entry.map((segment, segmentIndex) =>
                segment.kind === "markdown" ? (
                  <MessageResponse key={`${key}-${segmentIndex}`}>
                    {segment.text}
                  </MessageResponse>
                ) : (
                  <AssistantChart
                    code={segment.code}
                    key={`${key}-${segmentIndex}`}
                    streaming={!segment.closed}
                  />
                )
              );
            }

            if (entry.type === "text") {
              return <MessageResponse key={key}>{entry.text}</MessageResponse>;
            }

            if (isToolPart(entry)) {
              return <AssistantToolCall key={key} part={entry} />;
            }

            return null;
          })}
        </MessageContent>
        {isAssistant && copyable.length > 0 && (
          <MessageActions>
            <MessageAction
              label={m.assistant_copy()}
              onClick={() => navigator.clipboard.writeText(copyable)}
              tooltip={m.assistant_copy()}
            >
              <RiFileCopyLine className="size-3" />
            </MessageAction>
            {onRetry && (
              <MessageAction
                label={m.assistant_retry()}
                onClick={onRetry}
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
