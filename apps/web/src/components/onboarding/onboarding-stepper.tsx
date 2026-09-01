import { cn } from "@freenary/ui/lib/utils";
import { Check } from "@phosphor-icons/react";
import { Fragment } from "react";

import { m } from "@/paraglide/messages.js";

interface OnboardingStepperProps {
  current: number;
  /** Message functions, so the labels follow a locale change with the tree. */
  steps: readonly (() => string)[];
}

export const OnboardingStepper = ({
  current,
  steps,
}: OnboardingStepperProps) => (
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
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center text-xs font-medium ring-1 transition-colors",
                isComplete && "bg-primary text-primary-foreground ring-primary",
                isCurrent && "bg-secondary text-primary ring-primary",
                !(isComplete || isCurrent) &&
                  "bg-background text-muted-foreground ring-border"
              )}
            >
              {isComplete ? (
                <Check className="animate-in fade-in zoom-in-75 size-3.5 duration-200 ease-out motion-reduce:animate-none" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
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
              {/* Fills toward the step it leads to, rather than recolouring
                  the whole connector at once. */}
              <span
                className={cn(
                  "bg-primary block h-px w-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  isComplete ? "scale-x-100" : "scale-x-0"
                )}
              />
            </span>
          )}
        </Fragment>
      );
    })}
  </ol>
);
