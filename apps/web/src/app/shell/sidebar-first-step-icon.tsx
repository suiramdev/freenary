import type { IconComponentProps } from "@freenary/ui/lib/icon-context";
import { spring } from "@freenary/ui/lib/springs";
import { cn } from "@freenary/ui/lib/utils";
import { RiCheckboxCircleFill } from "@remixicon/react";
import type { KubaiIconComponent } from "kubai-icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext } from "react";

import type { ChartColorVar } from "@/shared/lib/chart-colors";
import { HostAnimatedKubaiIcon } from "@/shared/lib/kubai-icon";

interface FirstStepIconState {
  color: ChartColorVar;
  done: boolean;
  icon: KubaiIconComponent;
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

  const { color, done, icon: stepIcon } = state;
  const icon = done ? (
    <RiCheckboxCircleFill
      className={cn(className, "text-primary")}
      size={size}
      strokeWidth={strokeWidth}
    />
  ) : (
    <HostAnimatedKubaiIcon
      className={className}
      color={color}
      icon={stepIcon}
      size={size}
    />
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
        key={done ? "done" : "todo"}
        transition={spring.slow}
      >
        {icon}
      </motion.span>
    </AnimatePresence>
  );
};
