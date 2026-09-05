import { useSyncExternalStore } from "react";

/**
 * The choice the picker offers beside the browser models: the model the
 * instance hosts. Not a WebLLM id, so the two namespaces cannot collide.
 */
export const SERVER_MODEL = "server";

/** The model the reader picked last, so the next visit uses it unasked. */
const STORAGE_KEY = "freenary.assistant.model";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const read = (): string | null => localStorage.getItem(STORAGE_KEY);

/**
 * Client-only: null on the server and during hydration, so the two renders
 * cannot disagree on which model the composer names.
 */
export const useRememberedModel = (): string | null =>
  useSyncExternalStore(subscribe, read, () => null);

export const rememberModel = (modelId: string) => {
  localStorage.setItem(STORAGE_KEY, modelId);
  for (const listener of listeners) {
    listener();
  }
};

/**
 * What the remembered choice means on this instance. The hosted model needs
 * the instance to have one; with none, the reader has to pick a browser
 * model, and until they do there is nothing to answer with.
 */
export const resolveModelChoice = (
  remembered: string | null,
  serverModel: string | null
): string | null => {
  if (remembered !== null && remembered !== SERVER_MODEL) {
    return remembered;
  }
  return serverModel === null ? null : SERVER_MODEL;
};
