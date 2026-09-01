import { useEffect } from "react";

/**
 * Asks the browser to confirm before a document unload while `isDirty`.
 * Covers closing the tab, reloading, and the reload the language switcher
 * triggers — none of which the router's own navigation guards ever see.
 */
export const useUnsavedChangesWarning = (isDirty: boolean): void => {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const confirmUnload = (event: BeforeUnloadEvent) => {
      // The browser supplies its own wording and ignores any message we set.
      // `returnValue` is the only cancellation signal Chrome and Edge below 119
      // read, and Vite's default target still reaches back to 111.
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", confirmUnload);
    return () => window.removeEventListener("beforeunload", confirmUnload);
  }, [isDirty]);
};
