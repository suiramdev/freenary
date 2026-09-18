import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

const REALIGN_WINDOW_MS = 1500;

const USER_TAKEOVER_EVENTS = [
  "wheel",
  "touchstart",
  "keydown",
  "mousedown",
] as const;

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

    const realignToAnchor = () => element.scrollIntoView({ block: "start" });

    realignToAnchor();

    const pageHeightObserver = new ResizeObserver(realignToAnchor);
    let realignDeadline = 0;

    const stopRealigning = () => {
      pageHeightObserver.disconnect();
      clearTimeout(realignDeadline);

      for (const event of USER_TAKEOVER_EVENTS) {
        window.removeEventListener(event, stopRealigning);
      }
    };

    pageHeightObserver.observe(document.body);
    realignDeadline = window.setTimeout(stopRealigning, REALIGN_WINDOW_MS);

    for (const event of USER_TAKEOVER_EVENTS) {
      window.addEventListener(event, stopRealigning, { passive: true });
    }

    return stopRealigning;
  }, [anchor, hash, isReady]);

  return ref;
};
