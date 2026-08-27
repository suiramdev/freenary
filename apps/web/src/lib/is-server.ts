/**
 * Whether the code is running on the server (SSR) or in the browser.
 * Centralizes the typeof window check to a single location.
 */
// eslint-disable-next-line anti-slop/no-runtime-typeof -- typeof window is the canonical SSR/CSR detection idiom; no boundary alternative exists
export const isServer = typeof window === "undefined";
