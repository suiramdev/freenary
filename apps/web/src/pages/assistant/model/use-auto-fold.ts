import { useCallback, useEffect, useState } from "react";

const AUTO_FOLD_MS = 1000;

export const useAutoFold = (
  live: boolean
): [open: boolean, setOpen: (next: boolean) => void] => {
  const [open, setOpen] = useState(live);
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    if (live || taken || !open) {
      return;
    }

    const timer = setTimeout(() => setOpen(false), AUTO_FOLD_MS);

    return () => clearTimeout(timer);
  }, [live, open, taken]);

  const take = useCallback((next: boolean) => {
    setTaken(true);
    setOpen(next);
  }, []);

  return [open, take];
};
