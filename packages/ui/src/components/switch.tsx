"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import {
  useSizeVariant,
  type SizeVariant,
} from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";

// An on/off setting. The checked state stays the caller's: a setting whose
// change needs a confirmation or a further step passes the session's own
// value, so a cancelled step leaves the switch where it was.
//
// Sized off the ladder like every other control — the compact track matches a
// 28px row's optical weight, the default one a 36px row's.
const TRACK: Record<SizeVariant, string> = {
  default: "h-5 w-9",
  compact: "h-4 w-7",
};

const THUMB: Record<SizeVariant, string> = {
  default: "size-4 data-[checked]:translate-x-4",
  compact: "size-3 data-[checked]:translate-x-3",
};

interface SwitchProps extends SwitchPrimitive.Root.Props {
  /** Omitted, the switch follows the surrounding SizeProvider. */
  size?: SizeVariant;
}

function Switch({ className, size, ...props }: SwitchProps) {
  const variant = useSizeVariant(size);

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base UI renders a span, not a form control, so the disabled state is
        // `data-disabled`; a `disabled:` variant would never match.
        "bg-input data-[checked]:bg-primary focus-visible:ring-ring/30 relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        TRACK[variant],
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // A transition, not a keyframe: a switch flipped back mid-travel has
        // to turn around from where the thumb is.
        className={cn(
          "bg-background pointer-events-none block rounded-full shadow-sm transition-transform duration-150 [transition-timing-function:cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          THUMB[variant]
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
