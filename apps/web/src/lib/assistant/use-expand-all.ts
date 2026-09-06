import { useState } from "react";

/** One press of "Expand all" or "Collapse all"; `tick` tells presses apart. */
export interface ExpandAll {
  value: boolean;
  tick: number;
}

/**
 * A collapsible's open state under an "Expand all" control. The control's
 * latest press wins until the collapsible is toggled by hand, and a newer
 * press wins again over that toggle: derived from which press the toggle
 * came after, not synced.
 */
export const useExpandAll = (
  expanded: ExpandAll | undefined,
  fallback: boolean
): [open: boolean, setOpen: (next: boolean) => void] => {
  const [toggle, setToggle] = useState<{ open: boolean; tick?: number }>();
  const open =
    toggle && toggle.tick === expanded?.tick
      ? toggle.open
      : (expanded?.value ?? fallback);
  const setOpen = (next: boolean) =>
    setToggle({ open: next, tick: expanded?.tick });
  return [open, setOpen];
};
