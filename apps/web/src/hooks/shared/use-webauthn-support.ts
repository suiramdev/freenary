import { useSyncExternalStore } from "react";

/** WebAuthn support cannot change mid-page, so there is nothing to tear down. */
const stopListening = () => {
  // No subscription was opened.
};

/** Capability detection, not a changing value: nothing to subscribe to. */
const subscribeToNothing = () => stopListening;
const readWebAuthnSupport = () => "PublicKeyCredential" in window;
/** Undecided during SSR: not yet asked is not the same answer as "no". */
const undecidedSupport = () => null;

/**
 * Whether this browser can run a WebAuthn ceremony at all — `false` on a
 * plain-`http` origin too, where `PublicKeyCredential` is `[SecureContext]`.
 * `null` until the client answers, so a screen can wait instead of guessing.
 * This is the reader's answer; whether a deployment offers passkeys is the
 * server's, and the two are asked separately.
 */
export const useWebAuthnSupport = (): boolean | null =>
  useSyncExternalStore<boolean | null>(
    subscribeToNothing,
    readWebAuthnSupport,
    undecidedSupport
  );
