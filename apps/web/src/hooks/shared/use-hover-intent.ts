import { useEffect, useRef } from "react";

/**
 * A pointer must rest this long on a control before its target is fetched: a
 * sweep across the toolbar costs nothing.
 */
const INTENT_DELAY_MS = 80;

/**
 * Handlers that call `onIntent(value)` once the pointer has rested on the
 * element. Pointer only: keyboard focus moves through every control, and would
 * fetch the target of each one.
 */
export const useHoverIntent = <T>(
  onIntent: ((value: T) => void) | undefined
) => {
  // One timer is enough: only one element is under the pointer at a time.
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (value: T) =>
    onIntent === undefined
      ? undefined
      : {
          onPointerEnter: () => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(
              () => onIntent(value),
              INTENT_DELAY_MS
            );
          },
          onPointerLeave: () => window.clearTimeout(timer.current),
        };
};
