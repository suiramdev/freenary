import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/** How long the anchor keeps realigning while the rest of the page settles. */
const SETTLE_WINDOW_MS = 1500;

/**
 * Any of these means the user took over, so realigning must stop. `mousedown`
 * covers the scrollbar drag and middle-click autoscroll, which emit no `wheel`.
 */
const TAKEOVER_EVENTS = [
  "wheel",
  "touchstart",
  "keydown",
  "mousedown",
] as const;

/**
 * A hash arrived at by client-side navigation is not scrolled to, and the hash
 * can change without this section remounting. `isReady` holds the first scroll
 * until the caller's own content has replaced its skeleton.
 */
export const useScrollToAnchor = <T extends HTMLElement>(
  anchor: string,
  isReady = true
) => {
  const hash = useLocation({ select: (location) => location.hash });
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!(isReady && hash === anchor && element)) {
      return;
    }

    const align = () => element.scrollIntoView({ block: "start" });

    align();

    // Sections above resolve their own queries and change height afterwards,
    // which slides the target out of view; realign until the page stops moving.
    const observer = new ResizeObserver(align);
    let deadline = 0;

    const release = () => {
      observer.disconnect();
      clearTimeout(deadline);
      for (const event of TAKEOVER_EVENTS) {
        window.removeEventListener(event, release);
      }
    };

    observer.observe(document.body);
    deadline = window.setTimeout(release, SETTLE_WINDOW_MS);
    for (const event of TAKEOVER_EVENTS) {
      window.addEventListener(event, release, { passive: true });
    }

    return release;
  }, [anchor, hash, isReady]);

  return ref;
};
