import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";

export interface AssistantAvatarInput {
  status: "ready" | "submitted" | "streaming" | "error";
  hasError: boolean;
  toolRunning: boolean;
  justFinished: boolean;
  composerActive: boolean;
}

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
