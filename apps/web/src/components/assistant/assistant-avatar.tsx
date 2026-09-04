import { BrandAvatar } from "@freenary/ui/components/brand-avatar";
import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import { useState } from "react";

/** Seconds into a state at which it looks settled, for the still rows. */
const SETTLED = 1.2;

interface AssistantAvatarProps {
  state: BrandAvatarState;
  /**
   * Draw one settled frame and run no loop. What an already-answered row in
   * the transcript wants: a page of them must not cost a frame loop each.
   */
  frozen?: boolean;
  /** Accessible name; omit wherever the avatar sits beside text that names it. */
  label?: string;
  className?: string;
}

/**
 * The mark wearing the agent's state. Pointing at it while it rests makes it
 * grin, like the sidebar's mark — the greeting never interrupts a state the
 * agent is actually in.
 */
export const AssistantAvatar = ({
  className,
  frozen = false,
  label,
  state,
}: AssistantAvatarProps) => {
  const [greeted, setGreeted] = useState(false);
  const greeting = greeted && !frozen && state === "idle";

  return (
    // Pointer only: the mark is a decorative `<svg>` with no tab stop, so focus
    // never reaches this span.
    <span
      className="inline-flex shrink-0"
      onPointerEnter={() => setGreeted(true)}
      onPointerLeave={() => setGreeted(false)}
    >
      <BrandAvatar
        className={className}
        frozenAt={frozen ? SETTLED : undefined}
        label={label}
        state={greeting ? "happy" : state}
      />
    </span>
  );
};
