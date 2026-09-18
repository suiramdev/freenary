import { useChat } from "@ai-sdk/react";
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
import type { BrowserModelStatus } from "@/lib/assistant/browser/engine";
import {
  loadBrowserModel,
  useBrowserModel,
  useWebGpuSupport,
} from "@/lib/assistant/browser/engine";
import { createBrowserChatTransport } from "@/lib/assistant/browser/transport";
import { isToolPart } from "@/lib/assistant/execution";
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

interface AssistantChatProps {
  conversationId: string | undefined;
  initialMessages: UIMessage[] | undefined;
  isPending: boolean;
  serverModel: string | null;
  userName: string;
}

interface TranscriptTailProps {
  avatarState: BrandAvatarState;
  error: Error | undefined;
  onRetry: () => void;
  retrying: boolean;
  awaitingFirstChunk: boolean;
}

const ACKNOWLEDGE_MS = 1600;

const loadProgressOf = (
  engine: BrowserModelStatus,
  modelId: string | null
): number | undefined =>
  engine.phase === "loading" && engine.modelId === modelId
    ? engine.progress
    : undefined;

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

const TranscriptTail = ({
  avatarState,
  awaitingFirstChunk,
  error,
  onRetry,
  retrying,
}: TranscriptTailProps) => (
  <>
    {awaitingFirstChunk && (
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
  const [turn, setTurn] = useState<{ retrying: boolean; startedAt: number }>();
  const acknowledgeTimer = useRef(0);
  const webGpu = useWebGpuSupport();
  const browserModel = useBrowserModel();
  const selected = resolveModelChoice(useRememberedModel(), serverModel);
  const browserSelected = selected !== null && selected !== SERVER_MODEL;

  useEffect(() => {
    const engineBusy = browserModel.phase === "loading";
    const selectedAlreadyAttempted =
      browserModel.phase !== "idle" && browserModel.modelId === selected;

    if (
      browserSelected &&
      webGpu === true &&
      !(engineBusy || selectedAlreadyAttempted)
    ) {
      loadBrowserModel(selected);
    }
  }, [browserModel, browserSelected, selected, webGpu]);

  const ready =
    selected === SERVER_MODEL ||
    (browserSelected &&
      browserModel.phase === "ready" &&
      browserModel.modelId === selected);

  const transport = useMemo(
    () =>
      selected === SERVER_MODEL
        ? new DefaultChatTransport({
            api: `${getServerUrl()}/ai/chat`,
            body: { locale: getLocale() },
            credentials: "include",
          })
        : createBrowserChatTransport({ client, locale: getLocale }),
    [selected]
  );

  const refreshStoredConversation = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: orpc.assistant.getConversation.key(),
      }),
    [queryClient]
  );

  const { error, messages, regenerate, sendMessage, status, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    onFinish: ({ isAbort }) => {
      if (isAbort) {
        return;
      }

      refreshStoredConversation();

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
      onSuccess: refreshStoredConversation,
    })
  );

  const lastMessage = messages.at(-1);
  const toolRunning =
    lastMessage?.parts.some(
      (part) =>
        isToolPart(part) &&
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
    (messageId: string | null) => {
      setTurn({ retrying: true, startedAt: Date.now() });
      regenerate(messageId === null ? undefined : { messageId });
    },
    [regenerate]
  );
  const redoLastTurn = useCallback(() => redo(null), [redo]);

  const avatarState = assistantAvatarState({
    composerActive,
    hasError: error !== undefined,
    justFinished,
    status,
    toolRunning,
  });

  const { awaitingFirstChunk, liveMessageId, streamingMessageId } = livenessOf({
    attention: justFinished || composerActive || error !== undefined,
    messages,
    status,
  });

  const streaming = status === "streaming" || status === "submitted";
  const conversationKnown = conversationId !== undefined;

  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-0 flex-col gap-4 p-4">
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
                const isLastAnswer =
                  message.role === "assistant" && index === messages.length - 1;
                const retryable = isLastAnswer && status === "ready" && ready;

                return (
                  <AssistantMessage
                    avatarState={
                      message.id === liveMessageId ? avatarState : undefined
                    }
                    key={message.id}
                    live={live}
                    message={message}
                    onRetry={retryable ? redo : undefined}
                    retrying={live && (turn?.retrying ?? false)}
                    startedAt={live ? turn?.startedAt : undefined}
                    status={live ? status : "ready"}
                  />
                );
              })
            )}
            <TranscriptTail
              avatarState={avatarState}
              awaitingFirstChunk={awaitingFirstChunk}
              error={error}
              onRetry={redoLastTurn}
              retrying={turn?.retrying ?? false}
            />
          </ConversationContent>
          <ConversationScrollButton
            aria-label={m.assistant_scroll_to_latest()}
          />
        </Conversation>
      )}
      {!isPending && (
        <AssistantModelStatus
          browserModel={browserModel}
          selected={selected}
          webGpu={webGpu}
        />
      )}
      <AssistantComposer
        disabled={!(conversationKnown && ready)}
        modelSelector={
          !isPending && (
            <AssistantModelSelector
              disabled={streaming}
              loadingProgress={loadProgressOf(browserModel, selected)}
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
