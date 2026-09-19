import { useSyncExternalStore } from "react";

const unsubscribeFromNothing = () => null;
const subscribeToNothing = () => unsubscribeFromNothing;

export const isWebAuthnAvailable = (): boolean =>
  Object.hasOwn(window, "PublicKeyCredential");

const webAuthnSupportUnansweredOnServer = () => null;

export const useWebAuthnSupport = (): boolean | null =>
  useSyncExternalStore<boolean | null>(
    subscribeToNothing,
    isWebAuthnAvailable,
    webAuthnSupportUnansweredOnServer
  );
