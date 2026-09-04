import type { AvatarExpressionName } from "./expressions";

/**
 * An animation is a list of expressions to walk through. Keeping them as data
 * rather than as component state means the brand mark, the sidebar and any agent
 * surface all perform from the same score.
 */

export interface AvatarStep {
  expression: AvatarExpressionName;
  /** ms spent blending into this step's expression. */
  transition: number;
  /** ms spent holding it once reached. */
  hold: number;
}

export interface AvatarAnimation {
  steps: readonly [AvatarStep, ...AvatarStep[]];
  /** Repeat from the first step instead of holding the last one. */
  loop: boolean;
  /** ms after the start at which a coin begins falling towards the slot; `null` for none. */
  coinAt: number | null;
}

export const AVATAR_ANIMATIONS = {
  /** Notices the failure, then holds a concerned face. */
  alarmed: {
    coinAt: null,
    loop: false,
    steps: [
      { expression: "surprised", hold: 180, transition: 120 },
      { expression: "concerned", hold: 0, transition: 280 },
    ],
  },
  /** Notices you, takes a coin, is pleased about it. The sidebar's hover reply. */
  greeting: {
    coinAt: 80,
    loop: false,
    steps: [
      { expression: "curious", hold: 210, transition: 150 },
      { expression: "delighted", hold: 0, transition: 200 },
    ],
  },
  /**
   * Talking: a small, regular pulse between resting and pleased. `delighted`
   * comes last because reduced motion holds an animation's final expression,
   * and ending on `neutral` would leave the resting face while it writes.
   */
  speaking: {
    coinAt: null,
    loop: true,
    steps: [
      { expression: "neutral", hold: 120, transition: 220 },
      { expression: "delighted", hold: 140, transition: 220 },
    ],
  },
  /**
   * Working on something: a slow back-and-forth that reads at a glance.
   * `focused` comes last for the same reason `speaking` ends on `delighted` —
   * and because `curious` is the face that means "you are typing", which under
   * reduced motion would leave working and typing indistinguishable.
   */
  thinking: {
    coinAt: null,
    loop: true,
    steps: [
      { expression: "curious", hold: 320, transition: 260 },
      { expression: "focused", hold: 420, transition: 260 },
    ],
  },
  /** One-shot acknowledgement. */
  wink: {
    coinAt: null,
    loop: false,
    steps: [
      { expression: "winking", hold: 220, transition: 120 },
      { expression: "neutral", hold: 0, transition: 200 },
    ],
  },
} satisfies Record<string, AvatarAnimation>;

export type AvatarAnimationName = keyof typeof AVATAR_ANIMATIONS;
