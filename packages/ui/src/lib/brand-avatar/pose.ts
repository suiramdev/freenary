import { clamp, lerp, TAU } from "./math";
import type { BlobPose, CapsulePose } from "./shape";

/**
 * A pose is the avatar's complete appearance at one instant, expressed only as
 * numbers so two poses can be blended field by field. Nothing here knows about
 * time: `states.ts` produces a pose for a given moment, `engine.ts` blends the
 * one the avatar is leaving into the one it is entering.
 */

/** Measured off the mark: the three arcs, clockwise from twelve o'clock. */
export const BRAND_ARCS = [
  { name: "green", color: [0x28, 0xd2, 0x6e] as const, span: 165 },
  { name: "orange", color: [0xff, 0x96, 0x32] as const, span: 105 },
  { name: "blue", color: [0x35, 0x8f, 0xf3] as const, span: 90 },
] as const;

const BODY_RADIUS = 43;
/** The mark's own aperture: 0.42 of the outer radius. */
const LOGO_APERTURE = 18;
/** Widened aperture that leaves room for a face. */
export const FACE_APERTURE = 24;

/** Ring band below which a blended pose stops reading as a ring. */
const MIN_BAND = 6.5;

export type SectorPose = {
  /** Degrees added to all three arcs. */
  rotation: number;
  greenSpan: number;
  orangeSpan: number;
  blueSpan: number;
  /** Weight of `tintR/G/B` mixed into every arc, 0..1. */
  tint: number;
  tintR: number;
  tintG: number;
  tintB: number;
  opacity: number;
};

export interface FacePose {
  /** Fades every facial feature together. */
  opacity: number;
  /** Shifts both eyes and the mouth — the avatar has no separate pupils. */
  gazeX: number;
  gazeY: number;
  left: CapsulePose;
  right: CapsulePose;
  browLeft: CapsulePose;
  browRight: CapsulePose;
  mouth: CapsulePose;
}

export type DecorPose = {
  /** Expanding rings, used for notifications and listening. */
  pulseOpacity: number;
  pulsePhase: number;
  pulseSpread: number;
  pulseWidth: number;
  /** A dot with a short trail orbiting the body. */
  orbitOpacity: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSize: number;
  /** Four-pointed stars thrown outward. */
  sparkOpacity: number;
  sparkPhase: number;
  sparkSpread: number;
  sparkSize: number;
  /** Drifting "z" glyphs. */
  zzzOpacity: number;
  zzzPhase: number;
  zzzSize: number;
};

export interface Pose {
  body: BlobPose;
  aperture: BlobPose;
  sectors: SectorPose;
  face: FacePose;
  decor: DecorPose;
}

const restBlob = (radius: number): BlobPose => ({
  radius,
  squash: 0,
  lean: 0,
  taper: 0,
  droop: 0,
  rotation: 0,
  lobe2: 0,
  lobe2Phase: 0,
  lobe3: 0,
  lobe3Phase: 0,
  lobe5: 0,
  lobe5Phase: 0,
  x: 0,
  y: 0,
});

const EYE_GAP = 8.6;
const EYE_Y = -2.2;
const EYE_HALF_WIDTH = 4.8;
const EYE_REACH = 7.8;

const restEye = (side: 1 | -1): CapsulePose => ({
  x: side * EYE_GAP,
  y: EYE_Y,
  halfWidth: EYE_HALF_WIDTH,
  top: -EYE_REACH,
  bottom: EYE_REACH,
  topBow: 0,
  bottomBow: 0,
  round: 1,
  tilt: 0,
  opacity: 1,
});

const restBrow = (side: 1 | -1): CapsulePose => ({
  x: side * EYE_GAP,
  y: -13.4,
  halfWidth: 4.6,
  top: -1,
  bottom: 1,
  topBow: 0,
  bottomBow: 0,
  round: 1,
  tilt: 0,
  opacity: 0,
});

const restMouth = (): CapsulePose => ({
  x: 0,
  y: 10.6,
  halfWidth: 4.4,
  top: -1.4,
  bottom: 1.4,
  topBow: 0,
  bottomBow: 0,
  round: 1,
  tilt: 0,
  opacity: 0,
});

/** The mark exactly as it is drawn today: a plain ring, no face, no decor. */
export const markPose = (): Pose => ({
  body: restBlob(BODY_RADIUS),
  aperture: restBlob(LOGO_APERTURE),
  sectors: {
    rotation: 0,
    greenSpan: BRAND_ARCS[0].span,
    orangeSpan: BRAND_ARCS[1].span,
    blueSpan: BRAND_ARCS[2].span,
    tint: 0,
    tintR: 0,
    tintG: 0,
    tintB: 0,
    opacity: 1,
  },
  face: {
    opacity: 0,
    gazeX: 0,
    gazeY: 0,
    left: restEye(-1),
    right: restEye(1),
    browLeft: restBrow(-1),
    browRight: restBrow(1),
    mouth: restMouth(),
  },
  decor: {
    pulseOpacity: 0,
    pulsePhase: 0,
    pulseSpread: 0.5,
    pulseWidth: 2.4,
    orbitOpacity: 0,
    orbitAngle: 0,
    orbitRadius: BODY_RADIUS + 9,
    orbitSize: 3.4,
    sparkOpacity: 0,
    sparkPhase: 0,
    sparkSpread: 0.3,
    sparkSize: 5,
    zzzOpacity: 0,
    zzzPhase: 0,
    zzzSize: 7,
  },
});

/** The mark with its aperture opened and both eyes visible. */
export const facePose = (): Pose => {
  const pose = markPose();
  pose.aperture.radius = FACE_APERTURE;
  pose.face.opacity = 1;
  return pose;
};

/**
 * Fields that are angles or cycle counters rather than quantities, with the
 * period after which they render identically. They grow without bound — a
 * spinner thirty seconds in sits at 8760 degrees — so a transition has to
 * cross the gap to the target's nearest congruent value instead of unwinding
 * every turn the state has accumulated.
 */
const BLOB_CYCLES: Record<string, number> = {
  // TAU is a whole multiple of each harmonic's own period, so one table entry
  // is correct for all three phases.
  lobe2Phase: TAU,
  lobe3Phase: TAU,
  lobe5Phase: TAU,
  rotation: TAU,
};

const SECTOR_CYCLES: Record<string, number> = { rotation: 360 };

const DECOR_CYCLES: Record<string, number> = {
  orbitAngle: TAU,
  pulsePhase: 1,
  sparkPhase: 1,
  zzzPhase: 1,
};

const rebase = (
  source: Record<string, number>,
  target: Record<string, number>,
  cycles: Record<string, number>
): void => {
  for (const [key, period] of Object.entries(cycles)) {
    const from = source[key] ?? 0;
    const to = target[key] ?? 0;
    source[key] = from + period * Math.round((to - from) / period);
  }
};

/**
 * Moves a pose's cyclic fields onto the branch nearest the pose it is about to
 * blend into, so the blend itself can be a plain lerp.
 *
 * Resolving the wrap per frame instead would re-round against a target whose
 * rotation keeps advancing: once the gap crosses half a period the rounding
 * term steps, and the ring jumps most of a turn in a single frame.
 */
export const rebaseCycles = (source: Pose, target: Pose): void => {
  rebase(source.body, target.body, BLOB_CYCLES);
  rebase(source.aperture, target.aperture, BLOB_CYCLES);
  rebase(source.sectors, target.sectors, SECTOR_CYCLES);
  rebase(source.decor, target.decor, DECOR_CYCLES);
};

const mixNumbers = <T extends Record<string, number>>(
  from: T,
  to: T,
  weight: number
): T => {
  const out: Record<string, number> = {};
  for (const key of Object.keys(from)) {
    out[key] = lerp(from[key] ?? 0, to[key] ?? 0, weight);
  }
  // Safety: every key is copied from `from` and every value stays a number, so
  // the result has exactly `T`'s shape.
  return out as T;
};

export const blendPose = (from: Pose, to: Pose, weight: number): Pose => ({
  body: mixNumbers(from.body, to.body, weight),
  aperture: mixNumbers(from.aperture, to.aperture, weight),
  sectors: mixNumbers(from.sectors, to.sectors, weight),
  face: {
    opacity: lerp(from.face.opacity, to.face.opacity, weight),
    gazeX: lerp(from.face.gazeX, to.face.gazeX, weight),
    gazeY: lerp(from.face.gazeY, to.face.gazeY, weight),
    left: mixNumbers(from.face.left, to.face.left, weight),
    right: mixNumbers(from.face.right, to.face.right, weight),
    browLeft: mixNumbers(from.face.browLeft, to.face.browLeft, weight),
    browRight: mixNumbers(from.face.browRight, to.face.browRight, weight),
    mouth: mixNumbers(from.face.mouth, to.face.mouth, weight),
  },
  decor: mixNumbers(from.decor, to.decor, weight),
});

/**
 * Keeps a blended pose renderable. Halfway between "solid dot" and "open ring"
 * the two radii are independent, so the aperture has to be pushed back inside
 * the body — otherwise the inner edge crosses the outer one and the shape
 * inverts.
 */
export const normalizePose = (pose: Pose): Pose => {
  const bodyRadius = Math.max(pose.body.radius, 8);
  const maxAperture = Math.max(bodyRadius - MIN_BAND, 0);
  const apertureRadius = clamp(pose.aperture.radius, 0, maxAperture);
  const play = Math.max(maxAperture - apertureRadius, 0);

  pose.body.radius = bodyRadius;
  pose.aperture.radius = apertureRadius;
  pose.aperture.x = clamp(pose.aperture.x, -play, play);
  pose.aperture.y = clamp(pose.aperture.y, -play, play);
  return pose;
};
