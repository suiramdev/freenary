import { useEffect, useState } from "react";

const CELEBRATION_MS = 2600;

export const useStepCelebration = () => {
  const [celebrated, setCelebrated] = useState<string | null>(null);

  useEffect(() => {
    if (celebrated === null) {
      return;
    }

    const timer = window.setTimeout(() => setCelebrated(null), CELEBRATION_MS);

    return () => window.clearTimeout(timer);
  }, [celebrated]);

  return { celebrate: setCelebrated, celebrated };
};
