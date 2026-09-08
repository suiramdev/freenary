import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";

/** How long typing settles before it reaches the URL and the request. */
const SETTLE_MS = 300;

/**
 * A search box whose text lives in the URL without a round-trip per keystroke.
 * The box keeps its own draft — a keystroke that waited for the URL would be
 * re-rendered away — and only the settled text is worth a history entry or a
 * request. A shared link, Back or Forward carries text of its own, which wins.
 *
 * `onSettled` must be stable, or every render republishes the same text.
 */
export const useSettledText = (
  urlText: string,
  onSettled: (text: string) => void
) => {
  const [draft, setDraft] = useState(urlText);
  const settled = useDebouncedValue(draft, SETTLE_MS);
  const synced = useRef(urlText);

  useEffect(() => {
    if (settled === synced.current) {
      return;
    }
    synced.current = settled;
    onSettled(settled);
  }, [onSettled, settled]);

  useEffect(() => {
    if (urlText !== synced.current) {
      synced.current = urlText;
      setDraft(urlText);
    }
  }, [urlText]);

  return {
    /** What the box shows, updated on every keystroke. */
    draft,
    setDraft,
    /** What the request uses, once the typing has settled. */
    settled,
  };
};
