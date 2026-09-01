import { createContext, use } from "react";
import type { ReactNode } from "react";

/**
 * The accessible names the primitives supply themselves — the ones with no
 * visible text for a caller to pass in. They are English here so the package
 * still stands alone; an app that speaks more than one language overrides them
 * once with `UiLabelsProvider` instead of threading a prop through every call.
 */
export interface UiLabels {
  /** Dismiss control of a sheet. */
  close: string;
  /** Busy state of a spinner. */
  loading: string;
  /** Collapsed overflow of a breadcrumb trail. */
  more: string;
  scrollToEnd: string;
  scrollToStart: string;
  /** Accessible name of the mobile sidebar dialog. */
  sidebar: string;
  sidebarDescription: string;
  toggleSidebar: string;
}

const DEFAULT_UI_LABELS: UiLabels = {
  close: "Close",
  loading: "Loading",
  more: "More",
  scrollToEnd: "Scroll to end",
  scrollToStart: "Scroll to start",
  sidebar: "Sidebar",
  sidebarDescription: "Displays the mobile sidebar.",
  toggleSidebar: "Toggle Sidebar",
};

const UiLabelsContext = createContext(DEFAULT_UI_LABELS);

export const UiLabelsProvider = ({
  children,
  labels,
}: {
  children: ReactNode;
  labels: UiLabels;
}) => <UiLabelsContext value={labels}>{children}</UiLabelsContext>;

export const useUiLabels = (): UiLabels => use(UiLabelsContext);
