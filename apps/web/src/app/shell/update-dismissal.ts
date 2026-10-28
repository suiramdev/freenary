import { useSyncExternalStore } from "react";

const STORAGE_KEY = "freenary.update.dismissed";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const readDismissed = (): string | null => localStorage.getItem(STORAGE_KEY);

const UNKNOWN_UNTIL_HYDRATED = undefined;

export const useDismissedUpdate = (): string | null | undefined =>
  useSyncExternalStore(subscribe, readDismissed, () => UNKNOWN_UNTIL_HYDRATED);

export const dismissUpdate = (version: string) => {
  localStorage.setItem(STORAGE_KEY, version);

  for (const listener of listeners) {
    listener();
  }
};

export const isBannerShown = (
  latest: string | null,
  dismissed: string | null | undefined
): latest is string =>
  latest !== null && dismissed !== undefined && dismissed !== latest;
