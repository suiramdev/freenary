import type { AvatarAnimationName } from "@/lib/avatar/animations";
import type { AvatarExpressionName } from "@/lib/avatar/expressions";

export interface AssistantAvatarInput {
  /** `useChat().status`. */
  status: "ready" | "submitted" | "streaming" | "error";
  hasError: boolean;
  /** A tool call is in flight inside the answer being streamed. */
  toolRunning: boolean;
  /** An answer landed moments ago; the acknowledgement is short-lived. */
  justFinished: boolean;
  /** The composer has focus or text in it. */
  composerActive: boolean;
}

export interface AssistantAvatarState {
  animation: AvatarAnimationName | null;
  /** The resting face an animation falls back to when it clears. */
  expression: AvatarExpressionName;
  idle: boolean;
}

/**
 * The agent's state as a face. Precedence matters: a tool call mid-answer is
 * work, not speech, and a failure outranks whatever was happening when it hit.
 */
export const assistantAvatarState = ({
  composerActive,
  hasError,
  justFinished,
  status,
  toolRunning,
}: AssistantAvatarInput): AssistantAvatarState => {
  if (hasError || status === "error") {
    return { animation: "alarmed", expression: "concerned", idle: false };
  }

  if (status === "submitted" || (status === "streaming" && toolRunning)) {
    return { animation: "thinking", expression: "focused", idle: false };
  }

  if (status === "streaming") {
    return { animation: "speaking", expression: "neutral", idle: false };
  }

  if (justFinished) {
    return { animation: "wink", expression: "neutral", idle: false };
  }

  if (composerActive) {
    return { animation: null, expression: "curious", idle: true };
  }

  return { animation: null, expression: "neutral", idle: true };
};
