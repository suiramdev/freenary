import { useChat } from "@ai-sdk/react";
import { env } from "@freenary/env/web";
import { Button } from "@freenary/ui/components/button";
import { RiRefreshLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { AssistantChatSkeleton } from "@/components/assistant/assistant-chat-skeleton";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantEmptyState } from "@/components/assistant/assistant-empty-state";
import { AssistantMessage } from "@/components/assistant/assistant-message";
import { AssistantUnavailable } from "@/components/assistant/assistant-unavailable";
import { assistantAvatarState } from "@/lib/assistant/avatar-state";
import { getServerUrl } from "@/lib/server-url";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { orpc } from "@/utils/orpc";

/** How long the mark acknowledges an answer before going back to resting. */
const ACKNOWLEDGE_MS = 1600;

interface AssistantChatProps {
  configured: boolean;
  /** Identity of the active thread; undefined until the query resolves. */
  conversationId: string | undefined;
  initialMessages: UIMessage[] | undefined;
  isPending: boolean;
  userName: string;
}

const errorMessageOf = (message: string): string => {
  if (message.includes("rate_limited")) {
    return m.assistant_error_rate_limited();
  }

  if (message.includes("unconfigured")) {
    return m.assistant_unavailable_description();
  }

  return m.assistant_error_generic();
};

export const AssistantChat = ({
  configured,
  conversationId,
  initialMessages,
  isPending,
  userName,
}: AssistantChatProps) => {
  const queryClient = useQueryClient();
  const [composerActive, setComposerActive] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const acknowledgeTimer = useRef(0);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getServerUrl(env.VITE_SERVER_URL)}/ai/chat`,
        // The server cannot read the locale: it lives in a cookie on this origin.
        body: { locale: getLocale() },
        // The session cookie belongs to the API's origin, as with the oRPC link.
        credentials: "include",
      }),
    []
  );

  const { error, messages, regenerate, sendMessage, status, stop } = useChat({
    // `useChat` seeds `messages` once, when it builds the chat for an id. The
    // transcript arrives after mount, so the conversation's own id is what tells
    // it to rebuild — and archiving a thread changes that id.
    id: conversationId,
    messages: initialMessages,
    onFinish: ({ isAbort }) => {
      // `onFinish` runs on every outcome, including Stop. A stopped answer never
      // landed — the server discards it — so there is nothing to acknowledge.
      if (isAbort) {
        return;
      }

      // The turn the server just stored has to reach the query cache as well:
      // Home unmounts on any navigation, and remounting seeds a fresh chat from
      // that cache, so a stale entry would drop everything asked this visit.
      queryClient.invalidateQueries({
        queryKey: orpc.assistant.getConversation.key(),
      });

      setJustFinished(true);
      window.clearTimeout(acknowledgeTimer.current);
      acknowledgeTimer.current = window.setTimeout(
        () => setJustFinished(false),
        ACKNOWLEDGE_MS
      );
    },
    transport,
  });

  useEffect(() => () => window.clearTimeout(acknowledgeTimer.current), []);

  const newConversation = useMutation(
    orpc.assistant.startNewConversation.mutationOptions({
      // Refetching hands down a new `conversationId`, which recreates the chat
      // with an empty transcript — no local reset needed.
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.assistant.getConversation.key(),
        }),
    })
  );

  const lastMessage = messages.at(-1);
  const toolRunning =
    lastMessage?.parts.some(
      (part) =>
        part.type.startsWith("tool-") &&
        "state" in part &&
        (part.state === "input-streaming" || part.state === "input-available")
    ) ?? false;

  const avatarState = assistantAvatarState({
    composerActive,
    hasError: error !== undefined,
    justFinished,
    status,
    toolRunning,
  });

  if (!configured) {
    return <AssistantUnavailable />;
  }

  // One avatar carries the live state: the newest assistant row. Older rows stay
  // settled so a finished transcript animates nothing. It also carries the
  // resting reaction to the composer, which is otherwise invisible once the
  // empty state is gone.
  const isLive =
    status !== "ready" || justFinished || composerActive || error !== undefined;
  const liveMessageId = isLive
    ? messages.findLast((message) => message.role === "assistant")?.id
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      {isPending ? (
        <AssistantChatSkeleton />
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <AssistantEmptyState
                avatarState={avatarState}
                onSuggestion={(text) => sendMessage({ text })}
                userName={userName}
              />
            ) : (
              messages.map((message, index) => (
                <AssistantMessage
                  avatarState={
                    message.id === liveMessageId ? avatarState : undefined
                  }
                  key={message.id}
                  message={message}
                  // `regenerate()` posts no `messageId` at all unless it is
                  // named, and the server needs it to know which stored turn is
                  // being redone rather than appending a copy.
                  onRetry={
                    message.role === "assistant" &&
                    index === messages.length - 1 &&
                    status === "ready"
                      ? () => regenerate({ messageId: message.id })
                      : undefined
                  }
                />
              ))
            )}
            {error && (
              <div
                className="text-destructive flex items-center gap-2 text-sm"
                role="alert"
              >
                <span>{errorMessageOf(error.message)}</span>
                {/* A failed turn leaves no assistant row to hang an action on,
                    so the retry lives with the message. */}
                <Button onClick={() => regenerate()} size="sm" variant="ghost">
                  <RiRefreshLine className="size-3" />
                  {m.assistant_retry()}
                </Button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton
            aria-label={m.assistant_scroll_to_latest()}
          />
        </Conversation>
      )}
      <AssistantComposer
        // Until the id lands, `useChat` holds a generated one; sending now would
        // lose the question when the real id replaces the chat.
        disabled={conversationId === undefined}
        newConversationPending={newConversation.isPending}
        onActiveChange={setComposerActive}
        onNewConversation={() => newConversation.mutate({})}
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
        status={status}
      />
    </div>
  );
};
