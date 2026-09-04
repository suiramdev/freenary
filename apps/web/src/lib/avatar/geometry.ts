import type { AvatarEye, AvatarExpression } from "./expressions";

/**
 * The mark is a sphere seen head-on. Eyes and coin slot are flat shapes laid on
 * the sphere's surface and then projected, so they bulge towards the centre and
 * foreshorten towards the rim the way features on a real piggy bank would —
 * that is what keeps a circle with two dots from reading as a flat sticker.
 */

/** Sphere radius in viewBox units; every other length is in the same unit. */
const RADIUS = 100;
/** Camera distance. Six radii keeps the perspective bulge gentle. */
const FOCAL = 600;
/** Beyond this latitude the horizontal scale blows up towards the pole. */
const MAX_ELEVATION = 78;
/** A capsule thinner than this collapses into an invisible sliver. */
const MIN_EXTENT = 1.5;

const CORNER_SAMPLES = 6;
/** One sample per this many surface units of a straight edge, which curves once projected. */
const EDGE_SAMPLE_SPACING = 7;

/** Centred on the sphere, so a projected point is already its viewBox coordinate. */
export const AVATAR_VIEW_BOX = "-128 -128 256 256";

/** Perspective pushes the silhouette a little past the sphere's own radius. */
export const AVATAR_BODY_RADIUS =
  (RADIUS * FOCAL) / Math.sqrt(FOCAL ** 2 - RADIUS ** 2);

/** Eye centres sit below the equator, which leaves the crown to the slot. */
const EYE_ELEVATION = -8;

/**
 * High enough on the crown that foreshortening arches it — a slot sitting level
 * with the eyes reads as an eyebrow. Wide, because it has to survive 16px.
 */
const SLOT = {
  azimuth: 0,
  elevation: 38,
  height: 14,
  roundness: 1,
  tilt: 0,
  width: 96,
} satisfies SurfaceFeature;

export interface SurfaceFeature {
  /** Degrees around the vertical axis; positive is the viewer's right. */
  azimuth: number;
  /** Degrees above the equator. */
  elevation: number;
  /** Arc width on the surface. */
  width: number;
  /** Arc height on the surface. */
  height: number;
  /** 0 leaves square corners, 1 rounds the shape into a capsule. */
  roundness: number;
  /** Degrees of rotation inside the surface. */
  tilt: number;
}

export interface AvatarPaths {
  leftEye: string;
  rightEye: string;
  slot: string;
}

type Point2 = readonly [number, number];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Outline of a rounded rectangle in surface coordinates, y pointing down, walked
 * clockwise. Straight edges are sampled too: on the sphere they are arcs.
 */
const roundedRectOutline = (
  width: number,
  height: number,
  roundness: number
): Point2[] => {
  const halfWidth = Math.max(width, MIN_EXTENT) / 2;
  const halfHeight = Math.max(height, MIN_EXTENT) / 2;
  const radius = clamp(roundness, 0, 1) * Math.min(halfWidth, halfHeight);
  const straightX = halfWidth - radius;
  const straightY = halfHeight - radius;
  const points: Point2[] = [];

  const addEdge = (from: Point2, to: Point2) => {
    const samples = Math.max(
      1,
      Math.ceil(
        Math.hypot(to[0] - from[0], to[1] - from[1]) / EDGE_SAMPLE_SPACING
      )
    );

    for (let index = 0; index < samples; index += 1) {
      const progress = index / samples;
      points.push([
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
      ]);
    }
  };

  const addCorner = (centerX: number, centerY: number, startAngle: number) => {
    if (radius === 0) {
      return;
    }

    for (let index = 0; index < CORNER_SAMPLES; index += 1) {
      const angle = startAngle + (index / CORNER_SAMPLES) * (Math.PI / 2);
      points.push([
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      ]);
    }
  };

  addEdge([-straightX, -halfHeight], [straightX, -halfHeight]);
  addCorner(straightX, -straightY, -Math.PI / 2);
  addEdge([halfWidth, -straightY], [halfWidth, straightY]);
  addCorner(straightX, straightY, 0);
  addEdge([straightX, halfHeight], [-straightX, halfHeight]);
  addCorner(-straightX, straightY, Math.PI / 2);
  addEdge([-halfWidth, straightY], [-halfWidth, -straightY]);
  addCorner(-straightX, -straightY, Math.PI);

  return points;
};

/** Sphere surface point, y pointing down to match the viewBox. */
const surfacePoint = (
  azimuth: number,
  elevation: number
): readonly [number, number, number] => [
  RADIUS * Math.sin(azimuth) * Math.cos(elevation),
  -RADIUS * Math.sin(elevation),
  RADIUS * Math.cos(azimuth) * Math.cos(elevation),
];

const project = (point: readonly [number, number, number]): Point2 => {
  const scale = FOCAL / (FOCAL - point[2]);
  return [point[0] * scale, point[1] * scale];
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * `roll` turns the whole mark in the picture plane. It is applied here rather
 * than left to the caller as a `rotate()` transform so that a path can never be
 * drawn upright by a consumer that forgot it — and so the sphere's shading stays
 * put, the way a light source does when a head tilts.
 */
export const surfaceFeaturePath = (
  feature: SurfaceFeature,
  roll = 0
): string => {
  const outline = roundedRectOutline(
    feature.width,
    feature.height,
    feature.roundness
  );
  const tilt = radians(feature.tilt);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  const rollAngle = radians(roll);
  const cosRoll = Math.cos(rollAngle);
  const sinRoll = Math.sin(rollAngle);
  const azimuth = radians(feature.azimuth);
  const elevation = radians(
    clamp(feature.elevation, -MAX_ELEVATION, MAX_ELEVATION)
  );
  // A degree of azimuth covers less surface the further from the equator, so the
  // horizontal step is divided by the centre's cosine: the shape keeps its width
  // wherever it is placed.
  const azimuthPerUnit = 1 / (RADIUS * Math.cos(elevation));
  const commands: string[] = [];

  for (const [x, y] of outline) {
    const alongSurface = x * cosTilt - y * sinTilt;
    const downSurface = x * sinTilt + y * cosTilt;
    const [flatX, flatY] = project(
      surfacePoint(
        azimuth + alongSurface * azimuthPerUnit,
        elevation - downSurface / RADIUS
      )
    );

    commands.push(
      `${commands.length === 0 ? "M" : "L"}${round(flatX * cosRoll - flatY * sinRoll)} ${round(flatX * sinRoll + flatY * cosRoll)}`
    );
  }

  return `${commands.join("")}Z`;
};

const eyeFeature = (
  expression: AvatarExpression,
  eye: AvatarEye,
  side: -1 | 1
): SurfaceFeature => ({
  azimuth: expression.yaw + side * (expression.eyeSpread + eye.shiftX),
  elevation: EYE_ELEVATION + expression.pitch + eye.shiftY,
  height: eye.height,
  roundness: eye.roundness,
  tilt: side * eye.tilt,
  width: eye.width,
});

/** Every path the mark needs, fully described: nothing is left to a transform. */
export const avatarPaths = (expression: AvatarExpression): AvatarPaths => ({
  leftEye: surfaceFeaturePath(
    eyeFeature(expression, expression.left, -1),
    expression.roll
  ),
  rightEye: surfaceFeaturePath(
    eyeFeature(expression, expression.right, 1),
    expression.roll
  ),
  slot: surfaceFeaturePath(
    {
      ...SLOT,
      azimuth: SLOT.azimuth + expression.yaw,
      elevation: SLOT.elevation + expression.pitch,
    },
    expression.roll
  ),
});

const [, slotCenterY] = project(surfacePoint(0, radians(SLOT.elevation)));

/**
 * Where the resting slot's mouth lands on screen. A dropped coin aims here and
 * is clipped here, so both follow the geometry instead of a tuned constant.
 */
export const AVATAR_SLOT_Y = slotCenterY;
