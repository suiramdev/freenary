import { describe, expect, test } from "bun:test";

import {
  AVATAR_EXPRESSIONS,
  blendAvatarExpressions,
  withBlink,
} from "./expressions";
import { AVATAR_BODY_RADIUS, avatarPaths } from "./geometry";

const NUMBER = /-?\d+(?:\.\d+)?/gu;

interface Points {
  xs: number[];
  ys: number[];
}

interface Bounds {
  height: number;
  maxRadius: number;
  width: number;
}

const pointsOf = (path: string): Points => {
  const values = (path.match(NUMBER) ?? []).map(Number);

  expect(values.length).toBeGreaterThan(7);
  expect(values.every(Number.isFinite)).toBe(true);

  return {
    xs: values.filter((_, index) => index % 2 === 0),
    ys: values.filter((_, index) => index % 2 === 1),
  };
};

const boundsOf = (path: string): Bounds => {
  const { xs, ys } = pointsOf(path);

  return {
    height: Math.max(...ys) - Math.min(...ys),
    maxRadius: Math.max(...xs.map((x, index) => Math.hypot(x, ys[index] ?? 0))),
    width: Math.max(...xs) - Math.min(...xs),
  };
};

describe("every named expression", () => {
  for (const [name, expression] of Object.entries(AVATAR_EXPRESSIONS)) {
    test(`${name} keeps its features inside the silhouette`, () => {
      for (const path of Object.values(avatarPaths(expression))) {
        // A feature that crosses the rim reads as a hole in the mark's edge.
        expect(boundsOf(path).maxRadius).toBeLessThan(AVATAR_BODY_RADIUS - 6);
      }
    });
  }
});

test("the slot is foreshortened and arched by sitting on the crown", () => {
  const path = avatarPaths(AVATAR_EXPRESSIONS.neutral).slot;
  const { height, width } = boundsOf(path);
  const { ys } = pointsOf(path);

  // 14 surface units tall, and perspective magnifies whatever it projects, so
  // a shape pasted flat on the disc could not come out shorter than 14.
  expect(height).toBeLessThan(14);
  expect(width).toBeGreaterThan(height * 6);

  // The outline starts at the left end of the top edge; the edge's highest
  // point is its middle, which is the curve of the shell showing through.
  expect(ys[0] ?? 0).toBeGreaterThan(Math.min(...ys) + 1);
});

test("a lifted gaze raises the eyes and the slot with them", () => {
  const rest = avatarPaths(AVATAR_EXPRESSIONS.neutral);
  const lifted = avatarPaths({ ...AVATAR_EXPRESSIONS.neutral, pitch: 12 });

  expect(Math.min(...pointsOf(lifted.leftEye).ys)).toBeLessThan(
    Math.min(...pointsOf(rest.leftEye).ys)
  );
  expect(Math.min(...pointsOf(lifted.slot).ys)).toBeLessThan(
    Math.min(...pointsOf(rest.slot).ys)
  );
});

describe("blending", () => {
  test("lands exactly on both endpoints", () => {
    const from = AVATAR_EXPRESSIONS.neutral;
    const to = AVATAR_EXPRESSIONS.delighted;

    expect(blendAvatarExpressions(from, to, 0)).toEqual(from);
    expect(blendAvatarExpressions(from, to, 1)).toEqual(to);
  });

  test("passes between them in the middle", () => {
    const half = blendAvatarExpressions(
      AVATAR_EXPRESSIONS.neutral,
      AVATAR_EXPRESSIONS.delighted,
      0.5
    );

    expect(half.left.height).toBeCloseTo(
      (AVATAR_EXPRESSIONS.neutral.left.height +
        AVATAR_EXPRESSIONS.delighted.left.height) /
        2
    );
  });
});

describe("blinking", () => {
  test("closes the eyes without touching the slot", () => {
    const open = avatarPaths(AVATAR_EXPRESSIONS.neutral);
    const shut = avatarPaths(withBlink(AVATAR_EXPRESSIONS.neutral, 1));

    expect(boundsOf(shut.leftEye).height).toBeLessThan(
      boundsOf(open.leftEye).height / 4
    );
    expect(shut.slot).toBe(open.slot);
  });

  test("scales the showing expression instead of replacing it", () => {
    // Mid-blink a wink is still a wink: the shut eye stays the shut one.
    const winking = withBlink(AVATAR_EXPRESSIONS.winking, 0.5);

    expect(winking.right.height).toBeLessThan(winking.left.height);
    expect(withBlink(AVATAR_EXPRESSIONS.winking, 0)).toBe(
      AVATAR_EXPRESSIONS.winking
    );
  });
});
