import { clamp, DEG, TAU } from "./math";

/**
 * Path construction for the avatar. Two primitives carry the whole character:
 * a closed radial blob (the ring's outer edge and its inner aperture) and a
 * bowed capsule (both eyes, both brows, the mouth).
 *
 * Everything is emitted as cubic segments so a shape can be rotated by
 * transforming its points — the renderer only ever patches `d`, never a
 * transform attribute.
 */

export interface Point {
  x: number;
  y: number;
}

/** Control-point offset that turns a cubic into a quarter circle. */
const KAPPA = 0.5523;

const ORIGIN: Point = { x: 0, y: 0 };

const round2 = (value: number): number => Math.round(value * 100) / 100;

const move = (point: Point): string => `M${round2(point.x)} ${round2(point.y)}`;

const curve = (c1: Point, c2: Point, to: Point): string =>
  `C${round2(c1.x)} ${round2(c1.y)} ${round2(c2.x)} ${round2(c2.y)} ${round2(to.x)} ${round2(to.y)}`;

/**
 * A blob silhouette. Counts are fixed harmonics rather than a `lobes` field on
 * purpose: blending two states would land on a fractional harmonic, which is
 * no longer periodic over a full turn and kinks the seam at twelve o'clock.
 */
export type BlobPose = {
  /** Base radius before any deformation. */
  radius: number;
  /** Positive widens and flattens, negative narrows and heightens. */
  squash: number;
  /** Horizontal shear; positive leans the top to the right. */
  lean: number;
  /** Positive narrows the top relative to the bottom. */
  taper: number;
  /** Sags and spreads the lower half. */
  droop: number;
  /** Whole-silhouette rotation, in radians. */
  rotation: number;
  /** Amplitude of the two-lobe harmonic, as a fraction of `radius`. */
  lobe2: number;
  lobe2Phase: number;
  lobe3: number;
  lobe3Phase: number;
  lobe5: number;
  lobe5Phase: number;
  x: number;
  y: number;
};

const SQUASH_GAIN = 0.42;
const TAPER_GAIN = 0.5;
const DROOP_FALL = 0.34;
const DROOP_SPREAD = 0.22;

/** Samples the silhouette at one of `count` evenly spaced angles. */
const blobPoint = (blob: BlobPose, index: number, count: number): Point => {
  const angle = (index / count) * TAU + blob.rotation;
  const ripple =
    1 +
    blob.lobe2 * Math.cos(2 * (angle - blob.lobe2Phase)) +
    blob.lobe3 * Math.cos(3 * (angle - blob.lobe3Phase)) +
    blob.lobe5 * Math.cos(5 * (angle - blob.lobe5Phase));

  const rx = blob.radius * (1 + blob.squash * SQUASH_GAIN);
  const ry = blob.radius * (1 - blob.squash * SQUASH_GAIN);
  let x = rx * Math.sin(angle) * ripple;
  let y = -ry * Math.cos(angle) * ripple;

  x *= 1 + blob.taper * (y / blob.radius) * TAPER_GAIN;

  // `lower` is 0 across the top half and grows downward, so the sag stays
  // continuous through the seam.
  const lower = Math.max(0, y / blob.radius);
  y += blob.droop * blob.radius * DROOP_FALL * lower;
  x *= 1 + blob.droop * DROOP_SPREAD * lower;

  x += blob.lean * -y;

  return { x: x + blob.x, y: y + blob.y };
};

const BLOB_SAMPLES = 36;

/**
 * Closed Catmull-Rom spline through the sampled silhouette, converted to
 * cubics. 36 samples resolve the five-lobe harmonic with room to spare.
 */
export const blobPath = (blob: BlobPose, center: Point): string => {
  const points: Point[] = [];
  for (let index = 0; index < BLOB_SAMPLES; index += 1) {
    const point = blobPoint(blob, index, BLOB_SAMPLES);
    points.push({ x: center.x + point.x, y: center.y + point.y });
  }

  const at = (index: number): Point =>
    points[((index % BLOB_SAMPLES) + BLOB_SAMPLES) % BLOB_SAMPLES] ?? ORIGIN;

  let d = move(at(0));
  for (let index = 0; index < BLOB_SAMPLES; index += 1) {
    const previous = at(index - 1);
    const start = at(index);
    const end = at(index + 1);
    const next = at(index + 2);
    d += curve(
      {
        x: start.x + (end.x - previous.x) / 6,
        y: start.y + (end.y - previous.y) / 6,
      },
      { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 },
      end
    );
  }
  return `${d}Z`;
};

/**
 * A capsule whose top and bottom edges bow independently. One primitive covers
 * every facial feature: a pill for a wide eye, a thin upward-bowed band for a
 * smiling one, a flat line for a shut one, a downward bow for a frown.
 */
export type CapsulePose = {
  x: number;
  y: number;
  halfWidth: number;
  /** Top edge offset from the centre; negative is up. */
  top: number;
  /** Bottom edge offset from the centre; positive is down. */
  bottom: number;
  /** Displacement of the top edge's midpoint; positive bows it downward. */
  topBow: number;
  bottomBow: number;
  /** 0 leaves square corners, 1 rounds them as far as the geometry allows. */
  round: number;
  /** Rotation about the capsule's centre, in radians. */
  tilt: number;
  opacity: number;
};

/** A cubic's midpoint sits at 3/4 of its control offset. */
const BOW_TO_CONTROL = 4 / 3;

export const capsulePath = (capsule: CapsulePose, center: Point): string => {
  const halfWidth = Math.max(capsule.halfWidth, 0.2);
  const top = Math.min(capsule.top, capsule.bottom - 0.2);
  const bottom = capsule.bottom;
  const radius =
    Math.min(halfWidth, (bottom - top) / 2) * clamp(capsule.round, 0, 1);

  const sin = Math.sin(capsule.tilt);
  const cos = Math.cos(capsule.tilt);
  const place = (x: number, y: number): Point => ({
    x: center.x + capsule.x + x * cos - y * sin,
    y: center.y + capsule.y + x * sin + y * cos,
  });

  const topBow = top + capsule.topBow * BOW_TO_CONTROL;
  const bottomBow = bottom + capsule.bottomBow * BOW_TO_CONTROL;
  const inner = halfWidth - radius;
  const span = (inner * 2) / 3;

  const start = place(-inner, top);
  let d = move(start);
  // Top edge.
  d += curve(
    place(-inner + span, topBow),
    place(inner - span, topBow),
    place(inner, top)
  );
  // Top-right corner.
  d += curve(
    place(inner + radius * KAPPA, top),
    place(halfWidth, top + radius - radius * KAPPA),
    place(halfWidth, top + radius)
  );
  // Right side.
  d += curve(
    place(halfWidth, top + radius),
    place(halfWidth, bottom - radius),
    place(halfWidth, bottom - radius)
  );
  // Bottom-right corner.
  d += curve(
    place(halfWidth, bottom - radius + radius * KAPPA),
    place(inner + radius * KAPPA, bottom),
    place(inner, bottom)
  );
  // Bottom edge.
  d += curve(
    place(inner - span, bottomBow),
    place(-inner + span, bottomBow),
    place(-inner, bottom)
  );
  // Bottom-left corner.
  d += curve(
    place(-inner - radius * KAPPA, bottom),
    place(-halfWidth, bottom - radius + radius * KAPPA),
    place(-halfWidth, bottom - radius)
  );
  // Left side.
  d += curve(
    place(-halfWidth, bottom - radius),
    place(-halfWidth, top + radius),
    place(-halfWidth, top + radius)
  );
  // Top-left corner.
  d += curve(
    place(-halfWidth, top + radius - radius * KAPPA),
    place(-inner - radius * KAPPA, top),
    start
  );
  return `${d}Z`;
};

export const circlePath = (center: Point, radius: number): string => {
  const r = Math.max(radius, 0.01);
  return [
    `M${round2(center.x - r)} ${round2(center.y)}`,
    `A${round2(r)} ${round2(r)} 0 1 0 ${round2(center.x + r)} ${round2(center.y)}`,
    `A${round2(r)} ${round2(r)} 0 1 0 ${round2(center.x - r)} ${round2(center.y)}`,
    "Z",
  ].join("");
};

/** Two concentric circles; the renderer fills the slot with `evenodd`. */
export const annulusPath = (
  center: Point,
  outer: number,
  width: number
): string =>
  circlePath(center, outer) + circlePath(center, Math.max(outer - width, 0.01));

/** Sector of a disc, measured in degrees clockwise from twelve o'clock. */
export const wedgePath = (
  center: Point,
  radius: number,
  startDeg: number,
  sweepDeg: number
): string => {
  const sweep = clamp(sweepDeg, 0, 359.99);
  if (sweep < 0.01) {
    return "";
  }
  const edge = (deg: number): Point => ({
    x: center.x + radius * Math.sin(deg * DEG),
    y: center.y - radius * Math.cos(deg * DEG),
  });
  const from = edge(startDeg);
  const to = edge(startDeg + sweep);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M${round2(center.x)} ${round2(center.y)}`,
    `L${round2(from.x)} ${round2(from.y)}`,
    `A${round2(radius)} ${round2(radius)} 0 ${large} 1 ${round2(to.x)} ${round2(to.y)}`,
    "Z",
  ].join("");
};

/** Four-pointed star, used for the celebration and excitement sparkles. */
export const sparkPath = (
  center: Point,
  outer: number,
  rotation: number
): string => {
  const inner = outer * 0.32;
  const points: Point[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * TAU + rotation;
    const reach = index % 2 === 0 ? outer : inner;
    points.push({
      x: center.x + reach * Math.sin(angle),
      y: center.y - reach * Math.cos(angle),
    });
  }
  const [first = ORIGIN, ...rest] = points;
  return (
    move(first) +
    rest.map((point) => `L${round2(point.x)} ${round2(point.y)}`).join("") +
    "Z"
  );
};

/** Outline of a filled "z", drawn for the sleeping state. */
const Z_OUTLINE: readonly Point[] = [
  { x: -0.5, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: 0.5, y: -0.26 },
  { x: -0.14, y: 0.26 },
  { x: 0.5, y: 0.26 },
  { x: 0.5, y: 0.5 },
  { x: -0.5, y: 0.5 },
  { x: -0.5, y: 0.26 },
  { x: 0.14, y: -0.26 },
  { x: -0.5, y: -0.26 },
];

export const zPath = (center: Point, size: number, tilt: number): string => {
  const sin = Math.sin(tilt);
  const cos = Math.cos(tilt);
  const points = Z_OUTLINE.map((point) => ({
    x: center.x + (point.x * cos - point.y * sin) * size,
    y: center.y + (point.x * sin + point.y * cos) * size,
  }));
  const [first = ORIGIN, ...rest] = points;
  return (
    move(first) +
    rest.map((point) => `L${round2(point.x)} ${round2(point.y)}`).join("") +
    "Z"
  );
};
