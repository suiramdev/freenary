"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@freenary/ui/lib/utils";

// Work whose end is known gets a width, and the width transitions: progress
// that arrives in steps still reads as one movement forward. Work whose end is
// not known yet passes `value={null}`, and the indicator travels instead —
// the honest picture, rather than a bar guessing at a total.
//
// The caller names the task: `aria-label`, or a visible element wired with
// `aria-labelledby`. Base UI puts the role and the value on the root.
function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-primary absolute inset-y-0 rounded-full transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)] data-indeterminate:w-2/5 data-indeterminate:animate-[progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:transition-none"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
