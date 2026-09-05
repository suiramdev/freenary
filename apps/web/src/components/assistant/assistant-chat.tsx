import { useChat } from "@ai-sdk/react";
import { env } from "@freenary/env/web";
import { Button } from "@freenary/ui/components/button";
import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { RiRefreshLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { AssistantActivity } from "@/components/assistant/assistant-activity";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { AssistantChatSkeleton } from "@/components/assistant/assistant-chat-skeleton";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantEmptyState } from "@/components/assistant/assistant-empty-state";
import { AssistantMessage } from "@/components/assistant/assistant-message";
import { AssistantModelSelector } from "@/components/assistant/assistant-model-selector";
import { AssistantModelStatus } from "@/components/assistant/assistant-model-status";
import { assistantAvatarState } from "@/lib/assistant/avatar-state";
import {
  loadBrowserModel,
  useBrowserModel,
  useWebGpuSupport,
} from "@/lib/assistant/browser/engine";
import { createBrowserChatTransport } from "@/lib/assistant/browser/transport";
import { livenessOf } from "@/lib/assistant/liveness";
import {
  rememberModel,
  resolveModelChoice,
  SERVER_MODEL,
  useRememberedModel,
} from "@/lib/assistant/model-choice";
import { getServerUrl } from "@/lib/server-url";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { client, orpc } from "@/utils/orpc";

/** How long the mark acknowledges an answer before going back to resting. */
const ACKNOWLEDGE_MS = 1600;

interface AssistantChatProps {
  /** Identity of the active thread; undefined until the query resolves. */
  conversationId: string | undefined;
  initialMessages: UIMessage[] | undefined;
  isPending: boolean;
  /**
   * The model the instance hosts, or null without one. The reader picks it or
   * a model that runs in the browser; with none hosted, only the latter.
   */
  serverModel: string | null;
  userName: string;
}

const errorMessageOf = (message: string): string => {
  if (message.includes("rate_limited")) {
    return m.assistant_error_rate_limited();
  }

  if (message.includes("unconfigured")) {
    return m.assistant_unavailable_description();
  }

  if (message.includes("browser_model_context")) {
    return m.assistant_error_browser_context();
  }

  if (message.includes("browser_model")) {
    return m.assistant_error_browser_model();
  }

  return m.assistant_error_generic();
};

interface TranscriptTailProps {
  avatarState: BrandAvatarState;
  error: Error | undefined;
  onRetry: () => void;
  retrying: boolean;
  /** The question left and no chunk has arrived yet. */
  thinking: boolean;
}

/** What follows the last message: the first status line, or a failed turn. */
const TranscriptTail = ({
  avatarState,
  error,
  onRetry,
  retrying,
  thinking,
}: TranscriptTailProps) => (
  <>
    {thinking && (
      <div className="flex w-full gap-3">
        <AssistantAvatar className="mt-0.5 size-7" state={avatarState} />
        <AssistantActivity
          activity={{ kind: "thinking" }}
          retrying={retrying}
        />
      </div>
    )}
    {error && (
      <div
        className="text-destructive flex items-center gap-2 text-sm"
        role="alert"
      >
        <span>{errorMessageOf(error.message)}</span>
        {/* A failed turn leaves no assistant row to hang an action on, so the
            retry lives with the message. */}
        <Button onClick={onRetry} size="sm" variant="ghost">
          <RiRefreshLine className="size-3" />
          {m.assistant_retry()}
        </Button>
      </div>
    )}
  </>
);

export const AssistantChat = ({
  conversationId,
  initialMessages,
  isPending,
  serverModel,
  userName,
}: AssistantChatProps) => {
  const queryClient = useQueryClient();
  const [composerActive, setComposerActive] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  // When the question left, and whether it redoes the last turn: the answer's
  // clock and its first status line read from these.
  const [turn, setTurn] = useState<{ retrying: boolean; startedAt: number }>();
  const acknowledgeTimer = useRef(0);
  const webGpu = useWebGpuSupport();
  const browserModel = useBrowserModel();
  const selected = resolveModelChoice(useRememberedModel(), serverModel);
  const browserSelected = selected !== null && selected !== SERVER_MODEL;

  // A chosen device model loads itself, on this visit and every later one.
  // Not after it failed: the status line offers Retry, and a loop of failing
  // downloads is worse than one. A load already under way for another model
  // finishes first; the effect re-runs when the engine settles.
  useEffect(() => {
    const settled =
      browserModel.phase !== "loading" &&
      !(browserModel.phase !== "idle" && browserModel.modelId === selected);
    if (browserSelected && webGpu === true && settled) {
      loadBrowserModel(selected);
    }
  }, [browserModel, browserSelected, selected, webGpu]);

  const ready =
    selected === SERVER_MODEL ||
    (browserSelected &&
      browserModel.phase === "ready" &&
      browserModel.modelId === selected);

  // `useChat` reads the transport on every send, so switching models between
  // two questions needs no new chat.
  const transport = useMemo(
    () =>
      selected === SERVER_MODEL
        ? new DefaultChatTransport({
            api: `${getServerUrl(env.VITE_SERVER_URL)}/ai/chat`,
            // The server cannot read the locale: it lives in a cookie on this origin.
            body: { locale: getLocale() },
            // The session cookie belongs to the API's origin, as with the oRPC link.
            credentials: "include",
          })
        : createBrowserChatTransport({ client, locale: getLocale }),
    [selected]
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

  const ask = useCallback(
    (text: string) => {
      setTurn({ retrying: false, startedAt: Date.now() });
      sendMessage({ text });
    },
    [sendMessage]
  );
  const redo = useCallback(
    (messageId?: string) => {
      setTurn({ retrying: true, startedAt: Date.now() });
      regenerate(messageId ? { messageId } : undefined);
    },
    [regenerate]
  );

  const avatarState = assistantAvatarState({
    composerActive,
    hasError: error !== undefined,
    justFinished,
    status,
    toolRunning,
  });

  // One avatar carries the live state: the streaming answer, or otherwise the
  // newest answer while the composer has focus, an error shows or an answer
  // just landed. Older rows stay settled so a finished transcript animates
  // nothing.
  const { awaitingFirstChunk, liveMessageId, streamingMessageId } = livenessOf({
    attention: justFinished || composerActive || error !== undefined,
    messages,
    status,
  });

  const streaming = status === "streaming" || status === "submitted";

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
                onSuggestion={ready ? ask : undefined}
                userName={userName}
              />
            ) : (
              messages.map((message, index) => {
                const live = message.id === streamingMessageId;
                // Settled rows get constant props, so the memo holds and a
                // streamed chunk re-renders the live row alone.
                return (
                  <AssistantMessage
                    avatarState={
                      message.id === liveMessageId ? avatarState : undefined
                    }
                    key={message.id}
                    live={live}
                    message={message}
                    // `regenerate()` posts no `messageId` at all unless it is
                    // named, and the server needs it to know which stored turn
                    // is being redone rather than appending a copy.
                    onRetry={
                      message.role === "assistant" &&
                      index === messages.length - 1 &&
                      status === "ready" &&
                      ready
                        ? redo
                        : undefined
                    }
                    retrying={live && (turn?.retrying ?? false)}
                    startedAt={live ? turn?.startedAt : undefined}
                    status={live ? status : "ready"}
                  />
                );
              })
            )}
            <TranscriptTail
              avatarState={avatarState}
              error={error}
              onRetry={() => redo()}
              retrying={turn?.retrying ?? false}
              thinking={awaitingFirstChunk}
            />
          </ConversationContent>
          <ConversationScrollButton
            aria-label={m.assistant_scroll_to_latest()}
          />
        </Conversation>
      )}
      {/* Until `serverModel` is known, "Choose a model" would be a lie on an
          instance whose hosted model is about to become the default. */}
      {!isPending && (
        <AssistantModelStatus
          browserModel={browserModel}
          selected={selected}
          webGpu={webGpu}
        />
      )}
      <AssistantComposer
        // Until the id lands, `useChat` holds a generated one; sending now
        // would lose the question when the real id replaces the chat. And a
        // device model still downloading has nothing to answer with.
        disabled={conversationId === undefined || !ready}
        modelSelector={
          !isPending && (
            <AssistantModelSelector
              disabled={streaming}
              onSelect={rememberModel}
              selected={selected}
              serverModel={serverModel}
              webGpu={webGpu}
            />
          )
        }
        newConversationPending={newConversation.isPending}
        onActiveChange={setComposerActive}
        onNewConversation={() => newConversation.mutate({})}
        onSend={ask}
        onStop={stop}
        status={status}
      />
    </div>
  );
};
