/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { brandAvatarFrame, createBrandAvatarEngine } from "./engine";
import { type AvatarFrame, INK_SLOTS, poseToFrame } from "./frame";
import { blendPose, normalizePose } from "./pose";
import { BRAND_AVATAR_STATES, statePose, stateTransition } from "./states";

/** Every moment a viewer could land on, including one long after mount. */
const MOMENTS = [0, 0.07, 0.31, 0.5, 1.3, 2.9, 4.2, 17.6, 61.4];

const numbersIn = (frame: AvatarFrame): string =>
  [
    frame.clip,
    ...frame.sectors.map((s) => s.d),
    ...frame.ink.map((i) => i.d),
  ].join(" ");

const settledFrame = (
  state: (typeof BRAND_AVATAR_STATES)[number],
  time: number,
  age: number
): AvatarFrame => poseToFrame(normalizePose(statePose(state, time, age)));

/** States that spin the arcs or run a decor cycle off absolute time. */
const SPINNERS = ["loading", "celebrating", "excited", "thinking"] as const;

const ARC = /M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/;

/**
 * Where the first arc starts, in degrees clockwise from twelve o'clock, read
 * back off the emitted wedge — the angle a viewer actually sees.
 */
const arcStart = (frame: AvatarFrame): number => {
  const match = ARC.exec(frame.sectors[0]?.d ?? "");
  if (!match) {
    throw new Error("the green arc drew nothing");
  }
  const [, ox = "0", oy = "0", x = "0", y = "0"] = match;
  const degrees =
    (Math.atan2(Number(x) - Number(ox), -(Number(y) - Number(oy))) * 180) /
    Math.PI;
  return (degrees + 360) % 360;
};

describe("brand avatar geometry", () => {
  test("every state renders finite paths at any moment", () => {
    for (const state of BRAND_AVATAR_STATES) {
      for (const time of MOMENTS) {
        const frame = brandAvatarFrame(state, time);
        expect(numbersIn(frame)).not.toMatch(/NaN|Infinity|undefined/);
        expect(frame.clip.length).toBeGreaterThan(0);
        for (const ink of frame.ink) {
          expect(ink.opacity).toBeGreaterThanOrEqual(0);
          expect(ink.opacity).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test("the ink list covers every slot once, in order", () => {
    const slots = brandAvatarFrame("celebrating", 1).ink.map((ink) => ink.slot);
    expect(slots).toEqual([...INK_SLOTS]);
  });

  test("the logo state is the static mark, identical at any time", () => {
    const first = brandAvatarFrame("logo", 0);
    for (const time of MOMENTS) {
      expect(brandAvatarFrame("logo", time)).toEqual(first);
    }
  });

  test("a blend of any two states renders finite geometry", () => {
    for (const from of BRAND_AVATAR_STATES) {
      for (const to of BRAND_AVATAR_STATES) {
        for (const weight of [0.02, 0.19, 0.5, 0.81, 0.98]) {
          const frame = poseToFrame(
            normalizePose(
              blendPose(
                statePose(from, 0.4, 0.4),
                statePose(to, 0.4, 0.4),
                weight
              )
            )
          );
          expect(numbersIn(frame)).not.toMatch(/NaN|Infinity|undefined/);
          expect(frame.clip.length).toBeGreaterThan(0);
        }
      }
    }
  });

  /**
   * Halfway between "solid dot" and "open ring" the two radii are independent,
   * so an aperture that has outgrown its body has to be pushed back inside —
   * otherwise the inner edge crosses the outer one and the silhouette inverts.
   */
  test("an aperture wider than its body is pulled back inside", () => {
    const pose = statePose("idle", 0, 0);
    pose.body.radius = 20;
    pose.aperture.radius = 40;
    pose.aperture.x = 30;
    pose.aperture.y = -25;

    const fixed = normalizePose(pose);
    const band = fixed.body.radius - fixed.aperture.radius;
    expect(band).toBeGreaterThanOrEqual(6.5);
    expect(Math.abs(fixed.aperture.x)).toBeLessThanOrEqual(band);
    expect(Math.abs(fixed.aperture.y)).toBeLessThanOrEqual(band);
  });

  /**
   * A spinner thirty seconds in has accumulated 8760 degrees of rotation. Two
   * ways of getting that wrong are measurable from the emitted path: lerping
   * it against a resting zero unwinds two dozen turns, and re-resolving the
   * wrap every frame steps the rounding term mid-transition and jumps most of
   * a turn in one frame. A steady spin moves ~6 degrees per frame.
   */
  test("no transition into or out of a spin jumps the ring", () => {
    const FRAME = 1 / 60;
    let worst = 0;

    for (const spinner of SPINNERS) {
      for (const [from, to] of [
        ["idle", spinner],
        [spinner, "idle"],
      ] as const) {
        for (const start of [5, 13.5, 27.25, 53.5, 100]) {
          const engine = createBrandAvatarEngine(from, 0);
          let previous = arcStart(engine.sample(start));
          engine.setState(to, start);
          for (let step = 1; step <= 40; step += 1) {
            const angle = arcStart(engine.sample(start + step * FRAME));
            const jump = Math.abs(angle - previous);
            worst = Math.max(worst, Math.min(jump, 360 - jump));
            previous = angle;
          }
        }
      }
    }

    expect(worst).toBeLessThan(60);
  });
});

describe("brand avatar engine", () => {
  test("a transition lands exactly on the target state", () => {
    const engine = createBrandAvatarEngine("idle", 0);
    engine.sample(0.5);
    engine.setState("celebrating", 0.5);

    const landed = 0.5 + stateTransition("celebrating");
    expect(engine.sample(landed)).toEqual(
      settledFrame("celebrating", landed, landed - 0.5)
    );
    expect(engine.state()).toBe("celebrating");
  });

  test("a state change is visible before the transition ends", () => {
    const engine = createBrandAvatarEngine("logo", 0);
    const before = engine.sample(1);
    engine.setState("notification", 1);
    const during = engine.sample(1 + stateTransition("notification") / 3);

    expect(during.clip).not.toBe(before.clip);
    expect(during.clip).not.toBe(brandAvatarFrame("notification", 1).clip);
  });

  test("interrupting a transition still converges on the last state", () => {
    const engine = createBrandAvatarEngine("sleepy", 0);
    engine.sample(0.2);
    engine.setState("loading", 0.2);
    engine.sample(0.3);
    engine.setState("error", 0.3);

    const landed = 0.3 + stateTransition("error");
    expect(engine.sample(landed)).toEqual(
      settledFrame("error", landed, landed - 0.3)
    );
  });

  test("re-entering the current state does not restart it", () => {
    const engine = createBrandAvatarEngine("thinking", 0);
    const frame = engine.sample(2);
    engine.setState("thinking", 2);
    expect(engine.sample(2)).toEqual(frame);
  });
});
