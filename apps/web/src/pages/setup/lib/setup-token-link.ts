import { isServer } from "@/shared/lib/is-server";

const STORAGE_KEY = "freenary:setup-token";
const FRAGMENT_PREFIX = "#token=";
const WELL_FORMED_TOKEN = /^[\w-]{32,}$/u;

const listeners = new Set<() => void>();

const tokenInFragment = (): string | null => {
  const { hash } = window.location;

  return hash.startsWith(FRAGMENT_PREFIX)
    ? hash.slice(FRAGMENT_PREFIX.length)
    : null;
};

const wellFormedTokenInFragment = (): string | null => {
  const token = tokenInFragment();

  return token !== null && WELL_FORMED_TOKEN.test(token) ? token : null;
};

const captureSetupTokenLink = () => {
  if (tokenInFragment() === null) {
    return;
  }

  const token = wellFormedTokenInFragment();

  if (token !== null) {
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`
  );

  for (const notify of listeners) {
    notify();
  }
};

export const watchSetupTokenLink = () => {
  captureSetupTokenLink();
  window.addEventListener("hashchange", captureSetupTokenLink);

  return () => window.removeEventListener("hashchange", captureSetupTokenLink);
};

export const subscribeToSetupTokenLink = (onLink: () => void) => {
  listeners.add(onLink);

  return () => {
    listeners.delete(onLink);
  };
};

export const readLinkedSetupToken = (): string =>
  isServer
    ? ""
    : (wellFormedTokenInFragment() ??
      sessionStorage.getItem(STORAGE_KEY) ??
      "");

export const clearLinkedSetupToken = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
