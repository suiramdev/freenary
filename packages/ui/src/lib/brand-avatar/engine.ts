import { type AvatarFrame, poseToFrame } from "./frame";
import { clamp01, easeOutExpo } from "./math";
import { blendPose, normalizePose, type Pose, rebaseCycles } from "./pose";
import { type BrandAvatarState, statePose, stateTransition } from "./states";

/**
 * Drives the avatar without owning a clock: the caller passes the time, so a
 * paused avatar, a frozen thumbnail and a test all produce the same frame.
 *
 * A state change snapshots the pose being displayed and blends from that
 * snapshot rather than from the previous state's live pose. It costs a frozen
 * source for the length of one transition — a few hundred milliseconds, under
 * a weight that rises exponentially — and in exchange an interrupted
 * transition is exactly as correct as a completed one.
 */
export type BrandAvatarEngine = {
  state: () => BrandAvatarState;
  setState: (next: BrandAvatarState, time: number) => void;
  sample: (time: number) => AvatarFrame;
};

export const createBrandAvatarEngine = (
  initial: BrandAvatarState,
  time = 0
): BrandAvatarEngine => {
  let current = initial;
  let startedAt = time;
  let source: Pose | null = null;
  let shown: Pose = normalizePose(statePose(initial, time, 0));

  return {
    state: () => current,

    setState: (next, at) => {
      if (next === current) {
        return;
      }
      // Cross to the branch of every angle and cycle counter nearest the state
      // being entered, once, so the blend below stays a plain lerp.
      rebaseCycles(shown, statePose(next, at, 0));
      source = shown;
      current = next;
      startedAt = at;
    },

    sample: (at) => {
      const age = at - startedAt;
      const target = statePose(current, at, age);
      let pose = target;
      if (source) {
        const weight = easeOutExpo(clamp01(age / stateTransition(current)));
        pose = weight >= 1 ? target : blendPose(source, target, weight);
        if (weight >= 1) {
          source = null;
        }
      }
      shown = normalizePose(pose);
      return poseToFrame(shown);
    },
  };
};

/**
 * One settled frame of a state, with no transition and no engine to keep
 * alive — what a state board or a still export needs.
 */
export const brandAvatarFrame = (
  state: BrandAvatarState,
  time: number
): AvatarFrame => poseToFrame(normalizePose(statePose(state, time, time)));
