import {
  blink,
  clamp01,
  DEG,
  drift,
  easeOutCubic,
  easeOutExpo,
  hop,
  oscillate,
  TAU,
  wave,
} from "./math";
import { facePose, FACE_APERTURE, markPose, type Pose } from "./pose";
import type { CapsulePose } from "./shape";

/**
 * The state library. Each entry turns a moment in time into a complete pose;
 * `engine.ts` blends between two of them. Nothing here reads a clock, so the
 * same `(state, time)` always produces the same frame.
 *
 * `time` is absolute, which keeps every cycle continuous across a state change.
 * `age` is how long the state has been the target, and drives the one-shot
 * accents — the pop of a surprise, the shake of an error.
 */

export const BRAND_AVATAR_STATES = [
  "logo",
  "idle",
  "happy",
  "excited",
  "curious",
  "surprised",
  "confused",
  "thinking",
  "concerned",
  "sleepy",
  "celebrating",
  "loading",
  "notification",
  "listening",
  "speaking",
  "success",
  "error",
  "wink",
] as const;

export type BrandAvatarState = (typeof BRAND_AVATAR_STATES)[number];

/** Slow ripples that keep the silhouette from ever looking like a stencil. */
const organic = (pose: Pose, time: number, amount = 1): void => {
  pose.body.lobe3 = 0.013 * amount;
  pose.body.lobe3Phase = time * 0.42;
  pose.body.lobe5 = 0.008 * amount;
  pose.body.lobe5Phase = -time * 0.27;
  pose.body.lobe2 = 0.006 * amount;
  pose.body.lobe2Phase = time * 0.19;
};

/**
 * Scales the whole creature. Both radii move together: shrinking only the
 * outer edge would eat the ring band, and the band is the mark.
 */
const resize = (pose: Pose, factor: number): void => {
  pose.body.radius *= factor;
  pose.aperture.radius *= factor;
};

const breathing = (
  pose: Pose,
  time: number,
  hz: number,
  depth: number
): void => {
  const swell = wave(time, hz);
  resize(pose, 1 + depth * swell);
  pose.body.squash += depth * 0.8 * swell;
};

/** Squeezes an eye toward a closed line. `closure` runs 0..1. */
const shut = (eye: CapsulePose, closure: number): void => {
  const squeeze = 1 - closure * 0.93;
  eye.top *= squeeze;
  eye.bottom *= squeeze;
};

const blinking = (pose: Pose, time: number, period = 3.7, seed = 0): void => {
  const closure = blink(time, period, seed);
  if (closure > 0) {
    shut(pose.face.left, closure);
    shut(pose.face.right, closure);
  }
};

/** Upward crescent — the eye of a smile. `strength` runs 0..1. */
const crescent = (eye: CapsulePose, strength: number): void => {
  eye.halfWidth = 5.1;
  eye.top = -1.6 - 0.7 * (1 - strength);
  eye.bottom = 1.6;
  eye.topBow = -5.6 * strength;
  eye.bottomBow = -4.4 * strength;
};

const smile = (pose: Pose, width: number, open: number): void => {
  const mouth = pose.face.mouth;
  mouth.opacity = 1;
  mouth.halfWidth = width;
  mouth.top = -0.8 - open;
  mouth.bottom = 1.1 + open;
  mouth.topBow = 1.9 - open * 0.9;
  mouth.bottomBow = 2.6 + open * 0.6;
};

const logo = (): Pose => markPose();

const idle = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time);
  breathing(pose, time, 0.21, 0.012);
  blinking(pose, time);
  pose.face.gazeX = drift(time * 0.5, 3) * 2.6;
  pose.face.gazeY = drift(time * 0.42, 8) * 1.4;
  pose.body.lean = drift(time * 0.3, 5) * 0.014;
  return pose;
};

const happy = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.2);
  const bounce = hop(time, 1.15);
  pose.body.y = -2.6 * bounce;
  pose.body.squash = 0.075 - 0.15 * bounce;
  resize(pose, 1 + 0.012 * bounce);
  crescent(pose.face.left, 1);
  crescent(pose.face.right, 1);
  smile(pose, 4.6, 0);
  pose.face.gazeX = drift(time * 0.6, 2) * 1.4;
  return pose;
};

const excited = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.8);
  const bounce = hop(time, 2.5);
  resize(pose, 0.9 * (1 + 0.022 * bounce));
  pose.body.y = -4.4 * bounce;
  pose.body.squash = 0.13 - 0.28 * bounce;
  pose.sectors.rotation = time * 46;
  for (const eye of [pose.face.left, pose.face.right]) {
    eye.halfWidth = 5.1;
    eye.top = -8.4;
    eye.bottom = 8;
  }
  smile(pose, 4.4, 1.1 + 0.5 * bounce);
  pose.decor.sparkOpacity = 1;
  pose.decor.sparkPhase = time * 1.5;
  pose.decor.sparkSpread = 7;
  pose.decor.sparkSize = 4.6;
  return pose;
};

const curious = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time);
  breathing(pose, time, 0.24, 0.01);
  const scan = wave(time, 0.26);
  pose.body.lean = 0.12 + 0.03 * wave(time, 0.22);
  pose.body.rotation = 6 * DEG;
  pose.aperture.x = scan * 1.6;
  pose.face.gazeX = scan * 4.2;
  pose.face.gazeY = -1.4 + wave(time, 0.13) * 1.1;
  blinking(pose, time, 4.4);
  pose.face.left.halfWidth = 4.2;
  pose.face.left.top = -6.6;
  pose.face.left.bottom = 6.6;
  pose.face.right.halfWidth = 4.9;
  pose.face.right.top = -8.2;
  pose.face.right.bottom = 7.8;
  pose.face.browRight.opacity = 1;
  pose.face.browRight.y = -15.4;
  pose.face.browRight.tilt = -0.14;
  pose.face.mouth.opacity = 0.85;
  pose.face.mouth.halfWidth = 2.1;
  pose.face.mouth.top = -1.6;
  pose.face.mouth.bottom = 1.6;
  return pose;
};

const surprised = (time: number, age: number): Pose => {
  const pose = facePose();
  organic(pose, time, 0.6);
  const pop = easeOutExpo(clamp01(age / 0.26));
  const settle = easeOutCubic(clamp01((age - 0.3) / 0.7));
  resize(pose, 1 + 0.15 * pop - 0.09 * settle);
  pose.body.squash = -0.07 * pop + 0.03 * settle;
  pose.body.x = wave(time, 9) * 0.35 * (1 - settle);
  pose.aperture.radius += 3 * pop;
  for (const eye of [pose.face.left, pose.face.right]) {
    eye.halfWidth = 5.6;
    eye.top = -9.2 * (0.75 + 0.25 * pop);
    eye.bottom = 9.2 * (0.75 + 0.25 * pop);
  }
  for (const brow of [pose.face.browLeft, pose.face.browRight]) {
    brow.opacity = 1;
    brow.y = -16 - 0.8 * pop;
    brow.topBow = -1.3;
    brow.bottomBow = -1.3;
  }
  pose.face.mouth.opacity = 1;
  pose.face.mouth.halfWidth = 2.6;
  pose.face.mouth.top = -3;
  pose.face.mouth.bottom = 3;
  pose.face.mouth.y = 12.4;
  pose.decor.pulseOpacity = 0.5 * (1 - settle);
  pose.decor.pulsePhase = age * 1.1;
  pose.decor.pulseSpread = 9;
  return pose;
};

const confused = (time: number): Pose => {
  const pose = facePose();
  const rock = wave(time, 0.45);
  pose.body.rotation = rock * 6 * DEG;
  pose.body.lean = rock * 0.05;
  pose.body.lobe2 = 0.03;
  pose.body.lobe2Phase = time * 0.9;
  pose.body.lobe3 = 0.018;
  pose.body.lobe3Phase = -time * 0.6;
  blinking(pose, time, 4.8);
  pose.face.left.halfWidth = 3.7;
  pose.face.left.top = -4.6;
  pose.face.left.bottom = 5.1;
  pose.face.left.bottomBow = -1.2;
  pose.face.right.halfWidth = 5;
  pose.face.right.top = -8;
  pose.face.right.bottom = 8;
  pose.face.browLeft.opacity = 1;
  pose.face.browLeft.y = -12.6;
  pose.face.browLeft.tilt = 0.26;
  pose.face.browRight.opacity = 1;
  pose.face.browRight.y = -15.4;
  pose.face.browRight.tilt = -0.1;
  pose.face.mouth.opacity = 0.9;
  pose.face.mouth.halfWidth = 3.8;
  pose.face.mouth.topBow = 1.5;
  pose.face.mouth.bottomBow = -1.2;
  pose.face.gazeX = -1.6 + wave(time, 0.31) * 2.4;
  pose.face.gazeY = -1.8;
  return pose;
};

const thinking = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 0.8);
  breathing(pose, time, 0.18, 0.01);
  resize(pose, 0.86);
  pose.body.lean = 0.05;
  pose.sectors.rotation = time * 14;
  blinking(pose, time, 5.2);
  for (const eye of [pose.face.left, pose.face.right]) {
    eye.top = -4.6;
    eye.bottom = 5.5;
    eye.bottomBow = -0.9;
  }
  for (const brow of [pose.face.browLeft, pose.face.browRight]) {
    brow.opacity = 0.85;
    brow.y = -12.4;
  }
  pose.face.gazeX = -2.6 + drift(time * 0.8, 2) * 1.1;
  pose.face.gazeY = -2.8;
  pose.decor.orbitOpacity = 1;
  pose.decor.orbitAngle = time * TAU * 0.34;
  pose.decor.orbitRadius = 43;
  pose.decor.orbitSize = 3.6;
  return pose;
};

const concerned = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 0.7);
  breathing(pose, time, 0.3, 0.008);
  resize(pose, 0.965);
  pose.body.droop = 0.22;
  pose.body.squash = 0.07;
  pose.body.x = wave(time, 5.5) * 0.28;
  blinking(pose, time, 3.1);
  pose.face.left.top = -5.4;
  pose.face.left.bottom = 5.2;
  pose.face.left.topBow = 1.7;
  pose.face.left.tilt = 0.14;
  pose.face.right.top = -5.4;
  pose.face.right.bottom = 5.2;
  pose.face.right.topBow = 1.7;
  pose.face.right.tilt = -0.14;
  pose.face.browLeft.opacity = 1;
  pose.face.browLeft.y = -12.8;
  pose.face.browLeft.tilt = -0.3;
  pose.face.browRight.opacity = 1;
  pose.face.browRight.y = -12.8;
  pose.face.browRight.tilt = 0.3;
  pose.face.mouth.opacity = 1;
  pose.face.mouth.halfWidth = 3.6;
  pose.face.mouth.topBow = -1.7;
  pose.face.mouth.bottomBow = -2.3;
  pose.face.gazeY = 1.2;
  return pose;
};

const sleepy = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 0.5);
  const breath = wave(time, 0.13);
  resize(pose, 1 + 0.026 * breath);
  pose.body.droop = 0.42 + 0.08 * breath;
  pose.body.squash = 0.1;
  pose.body.y = 1.6 + 1.4 * oscillate(time, 0.13);
  pose.body.lean = 0.07;
  pose.body.rotation = 3 * DEG;
  pose.aperture.radius = 23;
  for (const eye of [pose.face.left, pose.face.right]) {
    eye.halfWidth = 5.3;
    eye.top = -0.9;
    eye.bottom = 1;
    eye.topBow = 0.9;
    eye.bottomBow = 0.6;
    eye.y = 0;
  }
  pose.face.mouth.opacity = 0.5;
  pose.face.mouth.halfWidth = 1.6;
  pose.face.mouth.top = -1.2;
  pose.face.mouth.bottom = 1.2;
  pose.decor.zzzOpacity = 1;
  pose.decor.zzzPhase = time * 0.34;
  pose.decor.zzzSize = 7;
  return pose;
};

const celebrating = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.6);
  const bounce = hop(time, 1.6);
  resize(pose, 0.84 * (1 + 0.02 * bounce));
  pose.body.y = -6.2 * bounce;
  pose.body.rotation = wave(time, 0.8) * 13 * DEG;
  pose.body.squash = 0.1 - 0.24 * bounce;
  pose.sectors.rotation = time * 96;
  crescent(pose.face.left, 1);
  crescent(pose.face.right, 1);
  smile(pose, 5.2, 1.6);
  pose.decor.sparkOpacity = 1;
  pose.decor.sparkPhase = time * 1.1;
  pose.decor.sparkSpread = 10;
  pose.decor.sparkSize = 5.8;
  pose.decor.pulseOpacity = 0.3;
  pose.decor.pulsePhase = time * 0.7;
  pose.decor.pulseSpread = 12;
  return pose;
};

/** The mark's three arcs, shrunk to one sweeping tricolour band. */
const loading = (time: number): Pose => {
  const pose = markPose();
  pose.aperture.radius = FACE_APERTURE;
  organic(pose, time, 0.6);
  breathing(pose, time, 0.5, 0.008);
  // Total angle the three arcs cover together, in degrees.
  const sweep = 96 + 46 * oscillate(time, 0.45);
  pose.sectors.greenSpan = sweep * 0.458;
  pose.sectors.orangeSpan = sweep * 0.292;
  pose.sectors.blueSpan = sweep * 0.25;
  // A uniform spin reads as mechanical; the added sine gives the sweep the
  // accelerate-and-catch-up feel of the arc it replaces.
  pose.sectors.rotation = time * 292 + 34 * wave(time, 0.45);
  return pose;
};

const notification = (time: number, age: number): Pose => {
  const pose = markPose();
  const pop = Math.sin(clamp01(age / 0.42) * Math.PI);
  pose.body.radius = 23 * (1 + 0.03 * wave(time, 1.1) + 0.12 * pop);
  pose.aperture.radius = 0;
  organic(pose, time, 0.8);
  pose.decor.pulseOpacity = 0.4;
  pose.decor.pulsePhase = time * 0.62;
  pose.decor.pulseSpread = 20;
  pose.decor.pulseWidth = 2.2;
  return pose;
};

/** Speech-shaped envelope in 0..1 built from three incommensurable sines. */
const voice = (time: number): number =>
  clamp01(
    0.45 +
      0.3 * wave(time, 1.7) +
      0.22 * wave(time, 3.3, 0.31) +
      0.16 * wave(time, 0.7, 0.7)
  );

const listening = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time);
  const level = voice(time);
  pose.aperture.radius = FACE_APERTURE - 0.6 + 1.4 * level;
  resize(pose, 0.92 * (1 + 0.026 * level));
  blinking(pose, time, 4.6);
  for (const eye of [pose.face.left, pose.face.right]) {
    eye.top = -7.6;
    eye.bottom = 7.2;
  }
  pose.face.gazeX = drift(time * 0.35, 4) * 1;
  pose.decor.pulseOpacity = 0.14 + 0.22 * level;
  pose.decor.pulsePhase = time * 0.85;
  pose.decor.pulseSpread = 8;
  pose.decor.pulseWidth = 2;
  return pose;
};

const speaking = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.1);
  const jaw = voice(time * 1.9);
  pose.body.squash = 0.02 + 0.03 * jaw;
  pose.body.y = -0.7 * jaw;
  pose.body.lean = wave(time, 0.37) * 0.03;
  blinking(pose, time, 4.2);
  const mouth = pose.face.mouth;
  mouth.opacity = 1;
  mouth.halfWidth = 3.4 + 1.2 * jaw;
  mouth.top = -0.8 - 2.6 * jaw;
  mouth.bottom = 0.8 + 2.8 * jaw;
  pose.face.gazeX = drift(time * 0.45, 6) * 1.6;
  return pose;
};

const success = (time: number, age: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.1);
  breathing(pose, time, 0.26, 0.01);
  const grow = easeOutCubic(clamp01(age / 0.5));
  pose.sectors.greenSpan = 165 + 195 * grow;
  pose.sectors.orangeSpan = 105 * (1 - grow);
  pose.sectors.blueSpan = 90 * (1 - grow);
  resize(pose, 1 + 0.075 * Math.sin(clamp01(age / 0.55) * Math.PI));
  crescent(pose.face.left, 1);
  crescent(pose.face.right, 1);
  smile(pose, 4.4, 0.2);
  pose.decor.pulseOpacity = 0.55 * (1 - clamp01(age / 1.2));
  pose.decor.pulsePhase = time * 0.9;
  pose.decor.pulseSpread = 10;
  return pose;
};

const error = (time: number, age: number): Pose => {
  const pose = facePose();
  organic(pose, time, 0.7);
  const shake = Math.exp(-age * 2.4) * Math.sin(age * TAU * 6.5);
  pose.body.x = shake * 3.6;
  pose.body.rotation = shake * 3 * DEG;
  pose.body.squash = 0.04;
  // Nearly all the way to alarm red: a lighter mix turns the green arc muddy
  // brown rather than red.
  pose.sectors.tint = 0.88;
  pose.sectors.tintR = 0xf2;
  pose.sectors.tintG = 0x55;
  pose.sectors.tintB = 0x5a;
  pose.face.left.halfWidth = 4.4;
  pose.face.left.top = -2.2;
  pose.face.left.bottom = 2.4;
  pose.face.left.tilt = 0.3;
  pose.face.right.halfWidth = 4.4;
  pose.face.right.top = -2.2;
  pose.face.right.bottom = 2.4;
  pose.face.right.tilt = -0.3;
  pose.face.browLeft.opacity = 1;
  pose.face.browLeft.y = -11.8;
  pose.face.browLeft.tilt = 0.34;
  pose.face.browRight.opacity = 1;
  pose.face.browRight.y = -11.8;
  pose.face.browRight.tilt = -0.34;
  pose.face.mouth.opacity = 1;
  pose.face.mouth.halfWidth = 3.8;
  pose.face.mouth.topBow = -1.4;
  pose.face.mouth.bottomBow = -1.8;
  return pose;
};

const wink = (time: number): Pose => {
  const pose = facePose();
  organic(pose, time, 1.1);
  const beat = hop(time, 0.9);
  pose.body.y = -1.7 * beat;
  pose.body.squash = 0.06 - 0.11 * beat;
  pose.body.lean = 0.08;
  pose.body.rotation = -4 * DEG;
  pose.face.left.halfWidth = 5;
  pose.face.left.top = -0.7;
  pose.face.left.bottom = 0.8;
  pose.face.left.topBow = -1.3;
  pose.face.left.bottomBow = -1.1;
  smile(pose, 3.6, 0);
  pose.face.mouth.x = 1.6;
  pose.face.mouth.tilt = -0.12;
  return pose;
};

interface StateSpec {
  /** Seconds the blend into this state takes. */
  transition: number;
  build: (time: number, age: number) => Pose;
}

const SPECS: Record<BrandAvatarState, StateSpec> = {
  logo: { transition: 0.55, build: logo },
  idle: { transition: 0.5, build: idle },
  happy: { transition: 0.42, build: happy },
  excited: { transition: 0.32, build: excited },
  curious: { transition: 0.5, build: curious },
  surprised: { transition: 0.16, build: surprised },
  confused: { transition: 0.5, build: confused },
  thinking: { transition: 0.5, build: thinking },
  concerned: { transition: 0.55, build: concerned },
  sleepy: { transition: 0.7, build: sleepy },
  celebrating: { transition: 0.3, build: celebrating },
  loading: { transition: 0.4, build: loading },
  notification: { transition: 0.35, build: notification },
  listening: { transition: 0.4, build: listening },
  speaking: { transition: 0.35, build: speaking },
  success: { transition: 0.28, build: success },
  error: { transition: 0.18, build: error },
  wink: { transition: 0.3, build: wink },
};

export const statePose = (
  state: BrandAvatarState,
  time: number,
  age: number
): Pose => SPECS[state].build(time, age);

export const stateTransition = (state: BrandAvatarState): number =>
  SPECS[state].transition;
