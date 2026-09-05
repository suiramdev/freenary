import { RiAddLine } from "@remixicon/react";
import type { ChatStatus } from "ai";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { m } from "@/paraglide/messages.js";

interface AssistantComposerProps {
  status: ChatStatus;
  /** The thread is not known yet, or nothing is loaded to answer with. */
  disabled: boolean;
  /** The picker for what answers, rendered in the tool row. */
  modelSelector: ReactNode;
  onSend: (text: string) => void;
  onStop: () => void;
  onNewConversation: () => void;
  /** Disabled while the previous conversation is being archived. */
  newConversationPending: boolean;
  onActiveChange: (active: boolean) => void;
}

export const AssistantComposer = ({
  disabled,
  modelSelector,
  newConversationPending,
  onActiveChange,
  onNewConversation,
  onSend,
  onStop,
  status,
}: AssistantComposerProps) => {
  const [text, setText] = useState("");
  const streaming = status === "streaming" || status === "submitted";

  const handleSubmit = (message: PromptInputMessage) => {
    const question = message.text.trim();

    if (question.length === 0 || streaming || disabled) {
      return;
    }

    onSend(question);
    setText("");
    onActiveChange(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled}
            onBlur={() => onActiveChange(text.length > 0)}
            onChange={(event) => {
              setText(event.currentTarget.value);
              onActiveChange(true);
            }}
            onFocus={() => onActiveChange(true)}
            placeholder={m.assistant_composer_placeholder()}
            value={text}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            {modelSelector}
            <PromptInputButton
              disabled={newConversationPending}
              onClick={onNewConversation}
            >
              <RiAddLine className="size-4" />
              <span>{m.assistant_new_conversation()}</span>
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit
            aria-label={streaming ? m.assistant_stop() : m.assistant_send()}
            disabled={disabled || !(streaming || text.trim().length > 0)}
            onClick={streaming ? onStop : undefined}
            status={status}
            type={streaming ? "button" : "submit"}
          />
        </PromptInputFooter>
      </PromptInput>
      <p className="text-muted-foreground text-center text-xs">
        {m.assistant_disclaimer()}
      </p>
    </div>
  );
};
