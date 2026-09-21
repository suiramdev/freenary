import type { IconComponentProps } from "@freenary/ui/lib/icon-context";
import { spring } from "@freenary/ui/lib/springs";
import { cn } from "@freenary/ui/lib/utils";
import type { RemixiconComponentType } from "@remixicon/react";
import { RiCheckboxCircleFill } from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext } from "react";

interface FirstStepIconState {
  done: boolean;
  icon: RemixiconComponentType;
}

const HIDDEN = { opacity: 0, scale: 0.25 };
const VISIBLE = { opacity: 1, scale: 1 };

export const FirstStepIconContext = createContext<FirstStepIconState | null>(
  null
);

export const SidebarFirstStepIcon = ({
  className,
  size,
  strokeWidth,
}: IconComponentProps) => {
  const prefersReducedMotion = useReducedMotion();
  const state = useContext(FirstStepIconContext);

  if (!state) {
    return null;
  }

  const Rendered = state.done ? RiCheckboxCircleFill : state.icon;
  const iconClassName = cn(className, state.done && "text-primary");
  const icon = (
    <Rendered className={iconClassName} size={size} strokeWidth={strokeWidth} />
  );

  if (prefersReducedMotion) {
    return icon;
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={VISIBLE}
        className="flex shrink-0 items-center"
        exit={{ ...HIDDEN, transition: spring.slow.exit }}
        initial={HIDDEN}
        key={state.done ? "done" : "todo"}
        transition={spring.slow}
      >
        {icon}
      </motion.span>
    </AnimatePresence>
  );
};
