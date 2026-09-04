/**
 * An expression is the avatar's whole facial state as plain numbers, so two of
 * them can be blended: the renderer never swaps one shape for another, it walks
 * the values between them.
 */

export interface AvatarEye {
  /** Arc width on the sphere's surface, in sphere units. */
  width: number;
  /** Arc height on the sphere's surface; near zero closes the eye. */
  height: number;
  /** 0 leaves square corners, 1 rounds the shape into a capsule. */
  roundness: number;
  /** Degrees of rotation inside the surface, mirrored per side: positive lifts the outer end. */
  tilt: number;
  /** Degrees of azimuth away from the centre line, mirrored per side. */
  shiftX: number;
  /** Degrees of elevation added to the eye. */
  shiftY: number;
}

export interface AvatarExpression {
  /** Degrees the mark turns around its vertical axis; positive looks to the viewer's right. */
  yaw: number;
  /** Degrees the mark tips back; positive raises every feature, reading as a lifted gaze. */
  pitch: number;
  /** Degrees the mark rotates in the picture plane. */
  roll: number;
  /** Degrees of azimuth between each eye and the centre line. */
  eyeSpread: number;
  left: AvatarEye;
  right: AvatarEye;
}

const OPEN_EYE: AvatarEye = {
  height: 42,
  roundness: 1,
  shiftX: 0,
  shiftY: 0,
  tilt: 0,
  width: 34,
};

const eye = (overrides: Partial<AvatarEye> = {}): AvatarEye => ({
  ...OPEN_EYE,
  ...overrides,
});

/** A flattened capsule reads as a squint; the outward tilt turns it into a smile. */
const SQUINT: AvatarEye = eye({ height: 15, shiftY: 2, tilt: 9, width: 36 });

export const AVATAR_EXPRESSIONS = {
  /** Lids lowered, outer ends dropped, gaze down: something went wrong. */
  concerned: {
    eyeSpread: 22,
    left: eye({ height: 34, shiftY: -3, tilt: -12, width: 32 }),
    pitch: -6,
    right: eye({ height: 34, shiftY: -3, tilt: -12, width: 32 }),
    roll: 2,
    yaw: 0,
  },
  /** Gaze lifted towards the slot, head cocked — the "something is coming" beat. */
  curious: {
    eyeSpread: 22,
    left: eye({ height: 47, shiftY: 3, width: 36 }),
    pitch: 6,
    right: eye({ height: 47, shiftY: 3, width: 36 }),
    roll: -7,
    yaw: 3,
  },
  /** Both eyes squinted into smiles. */
  delighted: {
    eyeSpread: 22,
    left: SQUINT,
    pitch: 2,
    right: SQUINT,
    roll: 0,
    yaw: 0,
  },
  /** Narrowed eyes, gaze slightly down: reading rather than reacting. */
  focused: {
    eyeSpread: 21,
    left: eye({ height: 38, width: 24 }),
    pitch: -3,
    right: eye({ height: 38, width: 24 }),
    roll: 0,
    yaw: -4,
  },
  /** The resting mark: the favicon, and the sidebar until something happens. */
  neutral: {
    eyeSpread: 22,
    left: eye(),
    pitch: 0,
    right: eye(),
    roll: 0,
    yaw: 0,
  },
  /** Lids most of the way down. */
  sleepy: {
    eyeSpread: 22,
    left: eye({ height: 12, shiftY: -6, width: 32 }),
    pitch: -7,
    right: eye({ height: 12, shiftY: -6, width: 32 }),
    roll: 3,
    yaw: 0,
  },
  /** Eyes wide open. */
  surprised: {
    eyeSpread: 23,
    left: eye({ height: 54, shiftY: 1, width: 42 }),
    pitch: 3,
    right: eye({ height: 54, shiftY: 1, width: 42 }),
    roll: 0,
    yaw: 0,
  },
  /** One eye shut. */
  winking: {
    eyeSpread: 22,
    left: eye({ height: 47, width: 36 }),
    pitch: 1,
    right: eye({ height: 11, shiftY: 2, tilt: 12, width: 34 }),
    roll: -4,
    yaw: 0,
  },
} satisfies Record<string, AvatarExpression>;

export type AvatarExpressionName = keyof typeof AVATAR_EXPRESSIONS;

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const blendEye = (
  from: AvatarEye,
  to: AvatarEye,
  progress: number
): AvatarEye => ({
  height: lerp(from.height, to.height, progress),
  roundness: lerp(from.roundness, to.roundness, progress),
  shiftX: lerp(from.shiftX, to.shiftX, progress),
  shiftY: lerp(from.shiftY, to.shiftY, progress),
  tilt: lerp(from.tilt, to.tilt, progress),
  width: lerp(from.width, to.width, progress),
});

export const blendAvatarExpressions = (
  from: AvatarExpression,
  to: AvatarExpression,
  progress: number
): AvatarExpression => ({
  eyeSpread: lerp(from.eyeSpread, to.eyeSpread, progress),
  left: blendEye(from.left, to.left, progress),
  pitch: lerp(from.pitch, to.pitch, progress),
  right: blendEye(from.right, to.right, progress),
  roll: lerp(from.roll, to.roll, progress),
  yaw: lerp(from.yaw, to.yaw, progress),
});

/**
 * A blink is a lid closing over whatever expression is showing, so it scales the
 * eye heights instead of replacing them — a wink stays a wink mid-blink.
 */
export const withBlink = (
  expression: AvatarExpression,
  amount: number
): AvatarExpression => {
  if (amount === 0) {
    return expression;
  }

  const close = 1 - amount * 0.94;

  return {
    ...expression,
    left: { ...expression.left, height: expression.left.height * close },
    right: { ...expression.right, height: expression.right.height * close },
  };
};
