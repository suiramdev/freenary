import { describe, expect, it } from "bun:test";

import { assistantAvatarState } from "./avatar-state";
import type { AssistantAvatarInput } from "./avatar-state";

const resting: AssistantAvatarInput = {
  composerActive: false,
  hasError: false,
  justFinished: false,
  status: "ready",
  toolRunning: false,
};

describe("assistantAvatarState", () => {
  it("rests when nothing is happening", () => {
    expect(assistantAvatarState(resting)).toBe("idle");
  });

  it("looks up while the user is writing", () => {
    expect(assistantAvatarState({ ...resting, composerActive: true })).toBe(
      "curious"
    );
  });

  it("thinks while waiting for the first token", () => {
    expect(assistantAvatarState({ ...resting, status: "submitted" })).toBe(
      "thinking"
    );
  });

  it("speaks while tokens stream", () => {
    expect(assistantAvatarState({ ...resting, status: "streaming" })).toBe(
      "speaking"
    );
  });

  it("goes back to thinking when a tool runs mid-answer", () => {
    expect(
      assistantAvatarState({
        ...resting,
        status: "streaming",
        toolRunning: true,
      })
    ).toBe("thinking");
  });

  it("acknowledges an answer that just landed", () => {
    expect(assistantAvatarState({ ...resting, justFinished: true })).toBe(
      "success"
    );
  });

  it("shows the failure even mid-stream, and even with a tool running", () => {
    expect(
      assistantAvatarState({
        composerActive: true,
        hasError: true,
        justFinished: true,
        status: "streaming",
        toolRunning: true,
      })
    ).toBe("error");
  });

  it("treats an error status with no error object as a failure", () => {
    expect(assistantAvatarState({ ...resting, status: "error" })).toBe("error");
  });
});
