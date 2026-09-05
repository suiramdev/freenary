import type { UIMessage } from "ai";

import type { ChatStatus } from "./execution";

export interface LivenessInput {
  messages: UIMessage[];
  status: ChatStatus;
  /** The mark has something to react to besides a stream: focus, an error, a landing. */
  attention: boolean;
}

export interface Liveness {
  /** The answer whose parts are still arriving. */
  streamingMessageId: string | undefined;
  /** The question left and no answer exists yet to be live. */
  awaitingFirstChunk: boolean;
  /** The row whose mark moves: the streaming answer, else the newest one on attention. */
  liveMessageId: string | undefined;
}

/**
 * Which row is live. The answer being streamed is the newest message, and
 * only once the first chunk created it: before that the question is the
 * newest message, and the wait gets its own pending row rather than the
 * previous answer's.
 */
export const livenessOf = ({
  attention,
  messages,
  status,
}: LivenessInput): Liveness => {
  const last = messages.at(-1);
  const inFlight = status === "submitted" || status === "streaming";
  const streamingMessageId =
    inFlight && last?.role === "assistant" ? last.id : undefined;

  return {
    awaitingFirstChunk: inFlight && last?.role === "user",
    liveMessageId:
      streamingMessageId ??
      (attention
        ? messages.findLast((message) => message.role === "assistant")?.id
        : undefined),
    streamingMessageId,
  };
};
