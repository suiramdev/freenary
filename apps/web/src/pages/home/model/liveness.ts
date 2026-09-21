import type { UIMessage } from "ai";

import type { ChatStatus } from "./execution";

export interface LivenessInput {
  messages: UIMessage[];
  status: ChatStatus;
  attention: boolean;
}

export interface Liveness {
  streamingMessageId: string | undefined;
  awaitingFirstChunk: boolean;
  liveMessageId: string | undefined;
}

export const livenessOf = ({
  attention,
  messages,
  status,
}: LivenessInput): Liveness => {
  const newest = messages.at(-1);
  const inFlight = status === "submitted" || status === "streaming";
  const streamingMessageId =
    inFlight && newest?.role === "assistant" ? newest.id : undefined;

  return {
    awaitingFirstChunk: inFlight && newest?.role === "user",
    liveMessageId:
      streamingMessageId ??
      (attention
        ? messages.findLast((message) => message.role === "assistant")?.id
        : undefined),
    streamingMessageId,
  };
};
