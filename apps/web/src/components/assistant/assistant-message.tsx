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
import { AssistantToolCall } from "@/components/assistant/assistant-tool-call";
import { m } from "@/paraglide/messages.js";

interface AssistantMessageProps {
  message: UIMessage;
  /** The live agent state, passed only to the turn currently being answered. */
  avatarState?: BrandAvatarState;
  onRetry?: () => void;
}

const textOf = (message: UIMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
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
  const copyable = textOf(message);

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
        <MessageContent>
          {message.parts.map((part, index) => {
            const key = `${message.id}-${index}`;

            if (part.type === "text") {
              return <MessageResponse key={key}>{part.text}</MessageResponse>;
            }

            if (isToolPart(part)) {
              return <AssistantToolCall key={key} part={part} />;
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
