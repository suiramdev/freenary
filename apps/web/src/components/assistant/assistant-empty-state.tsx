import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { m } from "@/paraglide/messages.js";

interface AssistantEmptyStateProps {
  avatarState: BrandAvatarState;
  userName: string;
  /** Absent while nothing is loaded to answer with. */
  onSuggestion: ((text: string) => void) | undefined;
}

export const AssistantEmptyState = ({
  avatarState,
  onSuggestion,
  userName,
}: AssistantEmptyStateProps) => {
  const suggestions = [
    m.assistant_suggestion_spending(),
    m.assistant_suggestion_cash_flow(),
    m.assistant_suggestion_recurring(),
  ];

  // `children` replaces the component's own icon/title/description, so the whole
  // greeting is composed here rather than passed as those three props.
  return (
    <ConversationEmptyState>
      <AssistantAvatar
        className="size-16"
        label={m.assistant_avatar_label()}
        state={avatarState}
      />
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {m.shell_dashboard_welcome({ name: userName })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {m.assistant_empty_description()}
        </p>
      </div>
      <Suggestions className="justify-center">
        {suggestions.map((suggestion) => (
          <Suggestion
            disabled={onSuggestion === undefined}
            key={suggestion}
            onClick={onSuggestion}
            suggestion={suggestion}
          />
        ))}
      </Suggestions>
    </ConversationEmptyState>
  );
};
