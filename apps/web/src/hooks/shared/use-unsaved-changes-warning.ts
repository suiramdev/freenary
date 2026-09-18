import { useEffect } from "react";

export const useUnsavedChangesWarning = (isDirty: boolean): void => {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const askBrowserToConfirmUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", askBrowserToConfirmUnload);

    return () =>
      window.removeEventListener("beforeunload", askBrowserToConfirmUnload);
  }, [isDirty]);
};
