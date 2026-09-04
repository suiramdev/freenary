import { useState } from "react";

import { FreenaryAvatar } from "@/components/shared/freenary-avatar";
import type { AssistantAvatarState } from "@/lib/assistant/avatar-state";

interface AssistantAvatarProps {
  state: AssistantAvatarState;
  /** Accessible name; omit wherever the avatar sits beside text that names it. */
  label?: string;
  className?: string;
}

/**
 * The mark wearing the agent's state. Pointing at it while it rests makes it
 * take a coin, like the sidebar's mark — the greeting never interrupts a state
 * the agent is actually in.
 */
export const AssistantAvatar = ({
  className,
  label,
  state,
}: AssistantAvatarProps) => {
  const [greeted, setGreeted] = useState(false);
  const resting = state.animation === null;
  const greeting = resting && greeted;

  return (
    // Pointer only: the mark is a decorative `<svg>` with no tab stop, so focus
    // never reaches this span.
    <span
      className="inline-flex shrink-0"
      onPointerEnter={() => setGreeted(true)}
      onPointerLeave={() => setGreeted(false)}
    >
      <FreenaryAvatar
        animation={greeting ? "greeting" : state.animation}
        className={className}
        expression={state.expression}
        idle={state.idle && !greeting}
        label={label}
      />
    </span>
  );
};
