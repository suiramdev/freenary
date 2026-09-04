import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";

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

/**
 * The agent's state as one face. Precedence matters: a tool call mid-answer is
 * work, not speech, and a failure outranks whatever was happening when it hit.
 */
export const assistantAvatarState = ({
  composerActive,
  hasError,
  justFinished,
  status,
  toolRunning,
}: AssistantAvatarInput): BrandAvatarState => {
  if (hasError || status === "error") {
    return "error";
  }

  if (status === "submitted" || (status === "streaming" && toolRunning)) {
    return "thinking";
  }

  if (status === "streaming") {
    return "speaking";
  }

  if (justFinished) {
    return "success";
  }

  return composerActive ? "curious" : "idle";
};
