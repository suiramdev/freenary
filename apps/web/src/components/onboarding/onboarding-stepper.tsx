import { cn } from "@freenary/ui/lib/utils";
import { Check } from "@phosphor-icons/react";
import { Fragment } from "react";

interface OnboardingStepperProps {
  current: number;
  steps: readonly string[];
}

export const OnboardingStepper = ({
  current,
  steps,
}: OnboardingStepperProps) => (
  <ol
    aria-label="Onboarding progress"
    className="flex items-center justify-center"
  >
    {steps.map((label, index) => {
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
                isCurrent && "bg-primary/10 text-primary ring-primary",
                !(isComplete || isCurrent) &&
                  "text-muted-foreground ring-border"
              )}
            >
              {isComplete ? <Check className="size-3.5" /> : index + 1}
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
              className={cn(
                "mx-3 h-px w-8 transition-colors sm:w-12",
                isComplete ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </Fragment>
      );
    })}
  </ol>
);
