import type { RemixiconComponentType } from "@remixicon/react";
import { RiCheckboxCircleFill } from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Scale and opacity only. Motion resolves a `none` filter target back to
 * `blur(0px)`, so blurring the swap would leave the entering icon permanently
 * layered — visible as a smudge in the collapsed rail, where it is all there is.
 */
const HIDDEN = { opacity: 0, scale: 0.25 };
const VISIBLE = { opacity: 1, scale: 1 };
const TRANSITION = { bounce: 0, duration: 0.3, type: "spring" } as const;

interface SidebarFirstStepIconProps {
  done: boolean;
  icon: RemixiconComponentType;
}

export const SidebarFirstStepIcon = ({
  done,
  icon: Icon,
}: SidebarFirstStepIconProps) => {
  const prefersReducedMotion = useReducedMotion();
  // Outline is the default variant; fill marks the step as done.
  const Rendered = done ? RiCheckboxCircleFill : Icon;
  const className = done ? "text-primary" : undefined;

  if (prefersReducedMotion) {
    return <Rendered className={className} data-icon="inline-start" />;
  }

  // popLayout takes the outgoing icon out of flow, so the label does not shift.
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={VISIBLE}
        className="flex shrink-0 items-center"
        exit={HIDDEN}
        initial={HIDDEN}
        key={done ? "done" : "todo"}
        transition={TRANSITION}
      >
        <Rendered className={className} data-icon="inline-start" />
      </motion.span>
    </AnimatePresence>
  );
};
