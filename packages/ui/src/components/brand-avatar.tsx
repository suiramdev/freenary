import {
  type BrandAvatarEngine,
  brandAvatarFrame,
  createBrandAvatarEngine,
} from "@freenary/ui/lib/brand-avatar/engine";
import {
  type AvatarFrame,
  INK_STYLES,
  VIEW_BOX_SIZE,
} from "@freenary/ui/lib/brand-avatar/frame";
import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { cn } from "@freenary/ui/lib/utils";
import * as React from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const watchReducedMotion = (onChange: () => void): (() => void) => {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/**
 * The mark as a character. It is the product logo — `state="logo"` draws
 * exactly the static ring — that morphs between the expressions in
 * `lib/brand-avatar/states.ts`.
 *
 * The avatar animates by patching `d` and `opacity` on a fixed set of paths
 * rather than by re-rendering: the shape list never changes, and a gallery of
 * these must not cost a React commit per frame per instance.
 */

/** Seconds into a state at which it looks settled, for still frames. */
const SETTLED = 1.2;

const CLIP_SLOT = "clip";

type NodeMap = Record<string, SVGPathElement | null>;

const write = (
  node: SVGPathElement | null | undefined,
  attribute: string,
  value: string
): void => {
  if (node && node.getAttribute(attribute) !== value) {
    node.setAttribute(attribute, value);
  }
};

const applyFrame = (nodes: NodeMap, frame: AvatarFrame): void => {
  write(nodes[CLIP_SLOT], "d", frame.clip);
  for (const sector of frame.sectors) {
    write(nodes[sector.id], "d", sector.d);
    write(nodes[sector.id], "fill", sector.fill);
  }
  for (const draw of frame.ink) {
    write(nodes[draw.slot], "d", draw.d);
    write(
      nodes[draw.slot],
      "opacity",
      (Math.round(draw.opacity * 1000) / 1000).toString()
    );
  }
};

type BrandAvatarProps = Omit<React.ComponentProps<"svg">, "children"> & {
  /** Which expression to hold. Defaults to the living rest state. */
  state?: BrandAvatarState;
  /** Rendered edge length in pixels. */
  size?: number;
  /**
   * Accessible name. Without one the avatar is decorative and hidden from
   * assistive technology — which is right when it sits inside a link or a
   * button that already names itself.
   */
  label?: string;
  /**
   * Draw one exact frame at this many seconds into the state and run no
   * animation loop. What a state board or a thumbnail wants.
   */
  frozenAt?: number;
};

function BrandAvatar({
  className,
  frozenAt,
  label,
  size = 40,
  state = "idle",
  ...props
}: BrandAvatarProps) {
  const clipId = `${React.useId()}brand-avatar`;
  // `false` on the server, so the markup rendered there matches the first
  // client render and the real preference lands on hydration.
  const reducedMotion = React.useSyncExternalStore(
    watchReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );
  const frozen = frozenAt ?? (reducedMotion ? SETTLED : undefined);

  const nodes = React.useRef<NodeMap>({});
  const engine = React.useRef<BrandAvatarEngine | null>(null);
  const origin = React.useRef(0);
  const pending = React.useRef(state);

  // The animated path attributes are written imperatively, so the rendered
  // markup only has to be right for the very first paint (and for every paint
  // when the avatar is frozen).
  const [mounted] = React.useState<AvatarFrame>(() =>
    brandAvatarFrame(state, 0)
  );
  const frame =
    frozen === undefined ? mounted : brandAvatarFrame(state, frozen);

  React.useEffect(() => {
    pending.current = state;
    engine.current?.setState(
      state,
      (performance.now() - origin.current) / 1000
    );
  }, [state]);

  React.useEffect(() => {
    if (frozen !== undefined) {
      return;
    }
    origin.current = performance.now();
    const running = createBrandAvatarEngine(pending.current, 0);
    engine.current = running;

    let request = 0;
    const tick = (now: number) => {
      applyFrame(nodes.current, running.sample((now - origin.current) / 1000));
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(request);
      engine.current = null;
    };
    // The loop must outlive a state change: the engine blends into the new
    // state instead of being rebuilt on it.
  }, [frozen]);

  React.useEffect(() => {
    if (frozen === undefined) {
      return;
    }
    // React only writes props it believes changed, and it believes every path
    // still holds the frame captured at mount — so a frame the loop wrote
    // imperatively would otherwise survive the loop being cancelled.
    applyFrame(nodes.current, frame);
  }, [frame, frozen]);

  const register = (slot: string) => (node: SVGPathElement | null) => {
    nodes.current[slot] = node;
  };

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("block shrink-0 overflow-visible", className)}
      data-slot="brand-avatar"
      data-state={state}
      height={size}
      role={label ? "img" : undefined}
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <path clipRule="evenodd" d={frame.clip} ref={register(CLIP_SLOT)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {frame.sectors.map((sector) => (
          <path
            d={sector.d}
            fill={sector.fill}
            key={sector.id}
            ref={register(sector.id)}
          />
        ))}
      </g>
      {frame.ink.map((draw) => (
        <path
          d={draw.d}
          fill={INK_STYLES[draw.slot].fill}
          fillRule={INK_STYLES[draw.slot].fillRule}
          key={draw.slot}
          opacity={draw.opacity}
          ref={register(draw.slot)}
        />
      ))}
    </svg>
  );
}

export { BrandAvatar, type BrandAvatarProps };
