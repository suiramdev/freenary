import type { RemixiconComponentType } from "@remixicon/react";
import { RiCheckboxCircleFill } from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface SidebarFirstStepIconProps {
  done: boolean;
  icon: RemixiconComponentType;
}

const HIDDEN = { opacity: 0, scale: 0.25 };
const VISIBLE = { opacity: 1, scale: 1 };
const TRANSITION = { bounce: 0, duration: 0.3, type: "spring" } as const;

export const SidebarFirstStepIcon = ({
  done,
  icon: Icon,
}: SidebarFirstStepIconProps) => {
  const prefersReducedMotion = useReducedMotion();
  const DoneOrPendingIcon = done ? RiCheckboxCircleFill : Icon;
  const doneClassName = done ? "text-primary" : undefined;

  if (prefersReducedMotion) {
    return (
      <DoneOrPendingIcon className={doneClassName} data-icon="inline-start" />
    );
  }

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
        <DoneOrPendingIcon className={doneClassName} data-icon="inline-start" />
      </motion.span>
    </AnimatePresence>
  );
};
