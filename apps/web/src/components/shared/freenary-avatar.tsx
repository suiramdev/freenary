import { cn } from "@freenary/ui/lib/utils";
import {
  animate,
  motion,
  useAnimationFrame,
  useIsomorphicLayoutEffect,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";

import type { AvatarAnimationName } from "@/lib/avatar/animations";
import { AVATAR_ANIMATIONS } from "@/lib/avatar/animations";
import type {
  AvatarExpression,
  AvatarExpressionName,
} from "@/lib/avatar/expressions";
import {
  AVATAR_EXPRESSIONS,
  blendAvatarExpressions,
  withBlink,
} from "@/lib/avatar/expressions";
import {
  AVATAR_BODY_RADIUS,
  AVATAR_SLOT_Y,
  AVATAR_VIEW_BOX,
  avatarPaths,
} from "@/lib/avatar/geometry";
import { AVATAR_SHADING } from "@/lib/avatar/shading";

type CubicEase = [number, number, number, number];

/** Time taken to fall back to the resting expression once an animation clears. */
const REST_MS = 260;
const TRANSITION_EASE: CubicEase = [0.2, 0, 0, 1];

const COIN_RADIUS = 13;
/** Fully outside the viewBox, so the coin is invisible until it is thrown. */
const COIN_START_Y = -152;
const COIN_FALL_MS = 340;
/** Weighted towards the end, because a falling coin accelerates. */
const COIN_FALL_EASE: CubicEase = [0.45, 0, 0.9, 0.55];

/** How far the mark squashes when a coin lands, as a fraction of its size. */
const IMPACT_SQUASH = 0.07;
const IMPACT_MS = 420;
/** The squash snaps in and eases out, so the peak sits early. */
const IMPACT_TIMES = [0, 0.22, 1];

const BLINK_MS = 170;
const BLINK_TIMES = [0, 0.42, 1];
const BLINK_MIN_MS = 3200;
const BLINK_SPREAD_MS = 4200;

/**
 * The clip cuts at the slot's centre line, so the coin has to travel a full
 * radius past it to be swallowed whole rather than left resting on the crown.
 */
const COIN_END_Y = AVATAR_SLOT_Y + COIN_RADIUS + AVATAR_SHADING.slotLipOffset;

interface Stoppable {
  stop: () => void;
}

export interface FreenaryAvatarProps {
  /**
   * The expression held while no animation is playing. `neutral` is the brand
   * mark; the others give an agent surface a face for its current state.
   */
  expression?: AvatarExpressionName;
  /** Animation to perform. Setting it back to `null` returns to `expression`. */
  animation?: AvatarAnimationName | null;
  /** Blink now and then while resting. Switch it off for a static mark. */
  idle?: boolean;
  /**
   * Accessible name. Omit it wherever the avatar sits beside a label that
   * already names it — the mark is then decoration.
   */
  label?: string;
  className?: string;
}

export const FreenaryAvatar = ({
  animation = null,
  className,
  expression = "neutral",
  idle = true,
  label,
}: FreenaryAvatarProps) => {
  const prefersReducedMotion = useReducedMotion();
  const svgId = useId();

  const faceRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGPathElement>(null);
  const rightEyeRef = useRef<SVGPathElement>(null);
  const slotRef = useRef<SVGPathElement>(null);
  const slotRimRef = useRef<SVGPathElement>(null);

  const restExpression = AVATAR_EXPRESSIONS[expression];
  const blendFrom = useRef<AvatarExpression>(restExpression);
  const blendTo = useRef<AvatarExpression>(restExpression);
  /** What the last frame drew, so an interrupted blend starts where it stopped. */
  const shown = useRef<AvatarExpression>(restExpression);
  const wasSettled = useRef(false);

  const blend = useMotionValue(1);
  const blink = useMotionValue(0);
  const impact = useMotionValue(0);
  const coinFall = useMotionValue(0);
  const coinY = useTransform(coinFall, [0, 1], [0, COIN_END_Y - COIN_START_Y]);

  // What the server ships, and what React re-renders whenever the resting
  // expression changes. The frame loop owns `d` from the first frame on.
  const firstPaths = useMemo(
    () => avatarPaths(restExpression),
    [restExpression]
  );

  const blending = useRef<Stoppable | null>(null);

  const settle = useCallback(
    (next: AvatarExpression, ms: number) => {
      blending.current?.stop();
      blendFrom.current = shown.current;
      blendTo.current = next;
      // `jump` rather than `set`: only `jump` cancels whatever is already
      // driving the value, so a restart cannot be overwritten a frame later.
      blend.jump(0);
      // A 0ms settle leaves every motion value where it already was, so without
      // this the loop's rest check would skip the one frame that draws it.
      wasSettled.current = false;

      if (ms === 0) {
        blend.jump(1);
        return;
      }

      blending.current = animate(blend, 1, {
        duration: ms / 1000,
        ease: TRANSITION_EASE,
      });
    },
    [blend]
  );

  useEffect(() => () => blending.current?.stop(), []);

  // Resting face. Kept apart from the performance below so that changing
  // `expression` mid-animation cannot restart the animation.
  useEffect(() => {
    if (animation !== null) {
      return;
    }

    settle(restExpression, prefersReducedMotion ? 0 : REST_MS);
  }, [animation, prefersReducedMotion, restExpression, settle]);

  useEffect(() => {
    if (animation === null) {
      return;
    }

    const sequence = AVATAR_ANIMATIONS[animation];
    const { steps } = sequence;

    if (prefersReducedMotion) {
      // The point of an animation is where it ends; skip the performance.
      const [first, ...rest] = steps;
      settle(AVATAR_EXPRESSIONS[(rest.at(-1) ?? first).expression], 0);
      return;
    }

    // Each step schedules the next, so clearing the pending timer is all it
    // takes to abandon a performance part-way through.
    let nextStep = 0;
    let timer = 0;

    const advance = () => {
      const step = steps[nextStep % steps.length] ?? steps[0];

      settle(AVATAR_EXPRESSIONS[step.expression], step.transition);
      nextStep += 1;

      if (nextStep < steps.length || sequence.loop) {
        timer = window.setTimeout(advance, step.transition + step.hold);
      }
    };

    advance();

    return () => window.clearTimeout(timer);
  }, [animation, prefersReducedMotion, settle]);

  const coinAt =
    animation === null ? null : AVATAR_ANIMATIONS[animation].coinAt;

  useEffect(() => {
    if (coinAt === null || prefersReducedMotion) {
      return;
    }

    // The cleanup below leaves a "finish the fall" animation running on
    // purpose, so a re-hover inside COIN_FALL_MS lands here with that animation
    // still driving the value: only `jump` cancels it, `set` would be
    // overwritten on the next frame and the coin would never be thrown again.
    coinFall.jump(0);
    const timers: number[] = [];

    timers.push(
      window.setTimeout(() => {
        animate(coinFall, 1, {
          duration: COIN_FALL_MS / 1000,
          ease: COIN_FALL_EASE,
        });
        timers.push(
          window.setTimeout(() => {
            animate(impact, [0, 1, 0], {
              duration: IMPACT_MS / 1000,
              ease: "easeOut",
              times: IMPACT_TIMES,
            });
          }, COIN_FALL_MS)
        );
      }, coinAt)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }

      // A coin caught mid-air finishes its fall instead of teleporting back out
      // of frame; the clip at the slot is what makes it disappear.
      const remaining = 1 - coinFall.get();

      if (remaining > 0 && remaining < 1) {
        animate(coinFall, 1, { duration: (remaining * COIN_FALL_MS) / 1000 });
      }
    };
  }, [coinAt, coinFall, impact, prefersReducedMotion]);

  useEffect(() => {
    if (!idle || prefersReducedMotion) {
      return;
    }

    let timer = 0;

    const schedule = () => {
      timer = window.setTimeout(
        () => {
          animate(blink, [0, 1, 0], {
            duration: BLINK_MS / 1000,
            ease: "easeInOut",
            times: BLINK_TIMES,
          });
          schedule();
        },
        BLINK_MIN_MS + Math.random() * BLINK_SPREAD_MS
      );
    };

    schedule();

    return () => window.clearTimeout(timer);
  }, [blink, idle, prefersReducedMotion]);

  const draw = (force: boolean) => {
    const progress = blend.get();
    const blinkAmount = blink.get();
    const impactAmount = impact.get();
    const settled = progress === 1 && blinkAmount === 0 && impactAmount === 0;

    // Nothing moves at rest, so a resting loop costs three reads and no work.
    if (!force && settled && wasSettled.current) {
      return;
    }

    wasSettled.current = settled;

    const base =
      progress === 1
        ? blendTo.current
        : blendAvatarExpressions(blendFrom.current, blendTo.current, progress);

    shown.current = base;

    const paths = avatarPaths(withBlink(base, blinkAmount));

    leftEyeRef.current?.setAttribute("d", paths.leftEye);
    rightEyeRef.current?.setAttribute("d", paths.rightEye);
    slotRef.current?.setAttribute("d", paths.slot);
    slotRimRef.current?.setAttribute("d", paths.slot);
    // Roll is already baked into the paths; this transform carries only the
    // coin's impact, which has to squash the body along with the face.
    faceRef.current?.setAttribute(
      "transform",
      `scale(${1 + IMPACT_SQUASH * impactAmount} ${1 - IMPACT_SQUASH * impactAmount})`
    );
  };

  // A render re-applies the resting paths, so the live frame has to be written
  // back before the browser paints or a running blend flashes its endpoint.
  useIsomorphicLayoutEffect(() => {
    draw(true);
  });

  useAnimationFrame(() => {
    draw(false);
  });

  return (
    <svg
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      className={cn("size-8 shrink-0", className)}
      role={label === undefined ? undefined : "img"}
      viewBox={AVATAR_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* A lit top-left and a shaded underside are what read the flat circle
            as a sphere, and they hold at 16px where any outline detail is gone. */}
        <radialGradient
          cx={AVATAR_SHADING.highlight.cx}
          cy={AVATAR_SHADING.highlight.cy}
          id={`${svgId}-light`}
          r={AVATAR_SHADING.highlight.r}
        >
          <stop
            offset="0"
            stopColor="#fff"
            stopOpacity={AVATAR_SHADING.highlight.opacity}
          />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          cx={AVATAR_SHADING.shade.cx}
          cy={AVATAR_SHADING.shade.cy}
          id={`${svgId}-shade`}
          r={AVATAR_SHADING.shade.r}
        >
          <stop
            offset="0"
            stopColor="#000"
            stopOpacity={AVATAR_SHADING.shade.opacity}
          />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* Cuts off at the slot's mouth, so a coin reaching it is swallowed. */}
        <clipPath id={`${svgId}-mouth`}>
          <rect height={300 + AVATAR_SLOT_Y} width="300" x="-150" y="-300" />
        </clipPath>
      </defs>

      <g ref={faceRef} transform="scale(1 1)">
        <circle className="fill-avatar-body" r={AVATAR_BODY_RADIUS} />
        <circle fill={`url(#${svgId}-light)`} r={AVATAR_BODY_RADIUS} />
        <circle fill={`url(#${svgId}-shade)`} r={AVATAR_BODY_RADIUS} />
        <circle
          className="fill-none stroke-black dark:stroke-white"
          r={AVATAR_BODY_RADIUS}
          strokeOpacity={AVATAR_SHADING.rimOpacity}
          strokeWidth={AVATAR_SHADING.rimWidth}
        />

        {/* The lit lip under the opening is what turns a dark capsule into a
            hole punched through the shell. */}
        <g transform={`translate(0 ${AVATAR_SHADING.slotLipOffset})`}>
          <path
            className="fill-white"
            d={firstPaths.slot}
            fillOpacity={AVATAR_SHADING.slotLipOpacity}
            ref={slotRimRef}
          />
        </g>
        <path className="fill-avatar-slot" d={firstPaths.slot} ref={slotRef} />

        <path
          className="fill-avatar-eye"
          d={firstPaths.leftEye}
          ref={leftEyeRef}
        />
        <path
          className="fill-avatar-eye"
          d={firstPaths.rightEye}
          ref={rightEyeRef}
        />
      </g>

      {/* The clip has to sit on a still parent: `clip-path` resolves in the
          element's own user space, so putting it on the moving group would drag
          the cut line down with the coin and never swallow it. */}
      <g clipPath={`url(#${svgId}-mouth)`}>
        <motion.g style={{ y: coinY }}>
          <circle
            className="fill-avatar-coin stroke-black/15"
            cy={COIN_START_Y}
            r={COIN_RADIUS}
            strokeWidth="2"
          />
        </motion.g>
      </g>
    </svg>
  );
};
