import { useIcon } from "@freenary/ui/lib/icon-context";
import { useSize } from "@freenary/ui/lib/size-context";
import { spring } from "@freenary/ui/lib/springs";
import { SURFACE_BG } from "@freenary/ui/lib/surface-classes";
import { useSurface } from "@freenary/ui/lib/surface-context";
import { cn } from "@freenary/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";

import { m } from "@/paraglide/messages.js";

interface OnboardingStepperProps {
  current: number;
  steps: readonly (() => string)[];
}

export const OnboardingStepper = ({
  current,
  steps,
}: OnboardingStepperProps) => {
  const CheckIcon = useIcon("check");
  const size = useSize();
  const substrate = useSurface();

  return (
    <ol
      aria-label={m.onboarding_progress_label()}
      className="flex items-center justify-center"
    >
      {steps.map((step, index) => {
        const label = step();
        const isComplete = index < current;
        const isCurrent = index === current;

        return (
          <Fragment key={label}>
            <li className="flex items-center gap-2.5">
              <motion.span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex aspect-square shrink-0 items-center justify-center ring-1",
                  size.control,
                  size.text,
                  isComplete &&
                    "bg-primary text-primary-foreground ring-primary",
                  isCurrent && "bg-secondary text-primary ring-primary",
                  !(isComplete || isCurrent) &&
                    cn(
                      SURFACE_BG[substrate],
                      "text-muted-foreground ring-border"
                    )
                )}
                transition={spring.fast}
              >
                <AnimatePresence initial={false} mode="wait">
                  {isComplete ? (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      initial={{ opacity: 0, scale: 0.75 }}
                      key="check"
                      transition={spring.fast}
                    >
                      <CheckIcon size={size.icon} />
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      initial={{ opacity: 0 }}
                      key="index"
                      transition={spring.fast}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <span
                className={cn(
                  size.text,
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </li>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-border mx-3 h-px w-8 overflow-hidden sm:w-12"
              >
                <motion.span
                  animate={{ scaleX: isComplete ? 1 : 0 }}
                  className="bg-primary block h-px w-full origin-left"
                  initial={false}
                  transition={spring.slow}
                />
              </span>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
};
