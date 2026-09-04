import { clamp01, fract, TAU } from "./math";
import { BRAND_ARCS, type Pose } from "./pose";
import {
  annulusPath,
  blobPath,
  capsulePath,
  circlePath,
  type Point,
  sparkPath,
  wedgePath,
  zPath,
} from "./shape";

/**
 * Turns a pose into the exact paths a renderer draws. The slot list is fixed
 * and ordered, so a renderer can mount the elements once and then only ever
 * patch `d` and `opacity` — no reconciliation while the avatar animates.
 */

export const INK_SLOTS = [
  "eye-left",
  "eye-right",
  "brow-left",
  "brow-right",
  "mouth",
  "orbit-0",
  "orbit-1",
  "orbit-2",
  "pulse-0",
  "pulse-1",
  "pulse-2",
  "spark-0",
  "spark-1",
  "spark-2",
  "spark-3",
  "spark-4",
  "spark-5",
  "zzz-0",
  "zzz-1",
  "zzz-2",
] as const;

export type InkSlot = (typeof INK_SLOTS)[number];

const hex = (rgb: readonly [number, number, number]): string =>
  `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

const SPARK_COLORS = [
  hex(BRAND_ARCS[0].color),
  hex(BRAND_ARCS[1].color),
  hex(BRAND_ARCS[2].color),
];

export type InkStyle = {
  fill: string;
  fillRule?: "evenodd";
};

/** Fills never animate, so they are read once at mount. */
export const INK_STYLES: Record<InkSlot, InkStyle> = {
  "eye-left": { fill: "currentColor" },
  "eye-right": { fill: "currentColor" },
  "brow-left": { fill: "currentColor" },
  "brow-right": { fill: "currentColor" },
  mouth: { fill: "currentColor" },
  "orbit-0": { fill: "currentColor" },
  "orbit-1": { fill: "currentColor" },
  "orbit-2": { fill: "currentColor" },
  "pulse-0": { fill: "currentColor", fillRule: "evenodd" },
  "pulse-1": { fill: "currentColor", fillRule: "evenodd" },
  "pulse-2": { fill: "currentColor", fillRule: "evenodd" },
  "spark-0": { fill: SPARK_COLORS[0] ?? "currentColor" },
  "spark-1": { fill: SPARK_COLORS[1] ?? "currentColor" },
  "spark-2": { fill: SPARK_COLORS[2] ?? "currentColor" },
  "spark-3": { fill: SPARK_COLORS[0] ?? "currentColor" },
  "spark-4": { fill: SPARK_COLORS[1] ?? "currentColor" },
  "spark-5": { fill: SPARK_COLORS[2] ?? "currentColor" },
  "zzz-0": { fill: "currentColor" },
  "zzz-1": { fill: "currentColor" },
  "zzz-2": { fill: "currentColor" },
};

export type InkDraw = {
  slot: InkSlot;
  d: string;
  opacity: number;
};

export type SectorDraw = {
  /** Stable across frames so a renderer can mount the arcs once. */
  id: string;
  d: string;
  fill: string;
};

export type AvatarFrame = {
  /** Ring silhouette: outer edge plus aperture, filled `evenodd`. */
  clip: string;
  sectors: SectorDraw[];
  /** Same length and order as `INK_SLOTS`. */
  ink: InkDraw[];
};

export const VIEW_BOX_SIZE = 100;
const CENTER: Point = { x: 50, y: 50 };

const EMPTY = "";

const mixChannel = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

const sectorFill = (
  base: readonly [number, number, number],
  pose: Pose
): string => {
  const { tint, tintR, tintG, tintB } = pose.sectors;
  if (tint <= 0) {
    return hex(base);
  }
  return hex([
    mixChannel(base[0], tintR, tint),
    mixChannel(base[1], tintG, tint),
    mixChannel(base[2], tintB, tint),
  ]);
};

const buildSectors = (pose: Pose): SectorDraw[] => {
  const spans = [
    pose.sectors.greenSpan,
    pose.sectors.orangeSpan,
    pose.sectors.blueSpan,
  ];
  // Overshoots the silhouette in every deformation; the ring clip cuts it back.
  const reach = pose.body.radius * 1.9 + 12;
  const origin: Point = {
    x: CENTER.x + pose.body.x,
    y: CENTER.y + pose.body.y,
  };

  let cursor = pose.sectors.rotation;
  return BRAND_ARCS.map((arc, index) => {
    const span = Math.max(spans[index] ?? 0, 0);
    const d = wedgePath(origin, reach, cursor, span);
    cursor += span;
    return { id: arc.name, d, fill: sectorFill(arc.color, pose) };
  });
};

const buildFace = (pose: Pose, center: Point): InkDraw[] => {
  const { face } = pose;
  const at: Point = {
    x: center.x + pose.aperture.x + face.gazeX,
    y: center.y + pose.aperture.y + face.gazeY,
  };
  const feature = (slot: InkSlot, capsule: typeof face.left): InkDraw => {
    const opacity = face.opacity * capsule.opacity;
    return {
      slot,
      d: opacity <= 0.002 ? EMPTY : capsulePath(capsule, at),
      opacity,
    };
  };

  return [
    feature("eye-left", face.left),
    feature("eye-right", face.right),
    feature("brow-left", face.browLeft),
    feature("brow-right", face.browRight),
    feature("mouth", face.mouth),
  ];
};

const ORBIT_SLOTS: InkSlot[] = ["orbit-0", "orbit-1", "orbit-2"];
const PULSE_SLOTS: InkSlot[] = ["pulse-0", "pulse-1", "pulse-2"];
const SPARK_SLOTS: InkSlot[] = [
  "spark-0",
  "spark-1",
  "spark-2",
  "spark-3",
  "spark-4",
  "spark-5",
];
const ZZZ_SLOTS: InkSlot[] = ["zzz-0", "zzz-1", "zzz-2"];

const blank = (slot: InkSlot): InkDraw => ({ slot, d: EMPTY, opacity: 0 });

const buildOrbit = (pose: Pose, center: Point): InkDraw[] => {
  const { orbitOpacity, orbitAngle, orbitRadius, orbitSize } = pose.decor;
  return ORBIT_SLOTS.map((slot, index) => {
    const opacity = orbitOpacity * (1 - index * 0.34);
    if (opacity <= 0.002) {
      return blank(slot);
    }
    const angle = orbitAngle - index * 0.17;
    const dot: Point = {
      x: center.x + orbitRadius * Math.sin(angle),
      y: center.y - orbitRadius * Math.cos(angle),
    };
    return {
      slot,
      d: circlePath(dot, orbitSize * (1 - index * 0.24)),
      opacity,
    };
  });
};

const buildPulse = (pose: Pose, center: Point): InkDraw[] => {
  const { pulseOpacity, pulsePhase, pulseSpread, pulseWidth } = pose.decor;
  return PULSE_SLOTS.map((slot, index) => {
    if (pulseOpacity <= 0.002) {
      return blank(slot);
    }
    const progress = fract(pulsePhase + index / PULSE_SLOTS.length);
    // Rings fade in over their first moments so none of them pops into place.
    const opacity =
      pulseOpacity * (1 - progress) ** 1.4 * clamp01(progress * 7);
    return {
      slot,
      d: annulusPath(
        center,
        pose.body.radius * 1.06 + progress * pulseSpread,
        pulseWidth
      ),
      opacity,
    };
  });
};

const buildSparks = (pose: Pose, center: Point): InkDraw[] => {
  const { sparkOpacity, sparkPhase, sparkSpread, sparkSize } = pose.decor;
  return SPARK_SLOTS.map((slot, index) => {
    if (sparkOpacity <= 0.002) {
      return blank(slot);
    }
    // Staggering by a prime-ish fraction keeps the ring of sparks from
    // pulsing in lockstep.
    const progress = fract(sparkPhase + index * 0.37);
    const envelope = Math.sin(progress * Math.PI);
    const angle = (index / SPARK_SLOTS.length) * TAU + index * 0.31;
    const distance = pose.body.radius * 1.02 + progress * sparkSpread;
    return {
      slot,
      d: sparkPath(
        {
          x: center.x + distance * Math.sin(angle),
          y: center.y - distance * Math.cos(angle),
        },
        sparkSize * envelope,
        progress * 1.6 + index
      ),
      opacity: sparkOpacity * envelope,
    };
  });
};

const buildZzz = (pose: Pose, center: Point): InkDraw[] => {
  const { zzzOpacity, zzzPhase, zzzSize } = pose.decor;
  return ZZZ_SLOTS.map((slot, index) => {
    if (zzzOpacity <= 0.002) {
      return blank(slot);
    }
    const progress = fract(zzzPhase + index / ZZZ_SLOTS.length);
    return {
      slot,
      d: zPath(
        {
          x: center.x + pose.body.radius * 0.5 + progress * 15,
          y: center.y - pose.body.radius * 0.5 - progress * 22,
        },
        zzzSize * (0.55 + progress * 0.75),
        0.12 + progress * 0.2
      ),
      opacity: zzzOpacity * Math.sin(progress * Math.PI),
    };
  });
};

export const poseToFrame = (pose: Pose): AvatarFrame => {
  const bodyCenter: Point = {
    x: CENTER.x + pose.body.x,
    y: CENTER.y + pose.body.y,
  };
  const body = blobPath(pose.body, CENTER);
  const hollow = pose.aperture.radius > 0.5;
  const clip = hollow ? body + blobPath(pose.aperture, bodyCenter) : body;

  return {
    clip,
    sectors: buildSectors(pose),
    ink: [
      ...buildFace(pose, bodyCenter),
      ...buildOrbit(pose, bodyCenter),
      ...buildPulse(pose, bodyCenter),
      ...buildSparks(pose, bodyCenter),
      ...buildZzz(pose, bodyCenter),
    ],
  };
};
