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
  it("rests neutral and keeps blinking when nothing is happening", () => {
    expect(assistantAvatarState(resting)).toEqual({
      animation: null,
      expression: "neutral",
      idle: true,
    });
  });

  it("looks up while the user is writing", () => {
    expect(
      assistantAvatarState({ ...resting, composerActive: true }).expression
    ).toBe("curious");
  });

  it("thinks while waiting for the first token", () => {
    expect(assistantAvatarState({ ...resting, status: "submitted" })).toEqual({
      animation: "thinking",
      expression: "focused",
      idle: false,
    });
  });

  it("speaks while tokens stream", () => {
    expect(
      assistantAvatarState({ ...resting, status: "streaming" }).animation
    ).toBe("speaking");
  });

  it("goes back to thinking when a tool runs mid-answer", () => {
    expect(
      assistantAvatarState({
        ...resting,
        status: "streaming",
        toolRunning: true,
      }).animation
    ).toBe("thinking");
  });

  it("acknowledges an answer that just landed", () => {
    expect(
      assistantAvatarState({ ...resting, justFinished: true }).animation
    ).toBe("wink");
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
    ).toEqual({
      animation: "alarmed",
      expression: "concerned",
      idle: false,
    });
  });

  it("treats an error status with no error object as a failure", () => {
    expect(
      assistantAvatarState({ ...resting, status: "error" }).animation
    ).toBe("alarmed");
  });
});
