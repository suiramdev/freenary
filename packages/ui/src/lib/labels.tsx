import { createContext, use } from "react";
import type { ReactNode } from "react";

/**
 * The accessible names the primitives supply themselves — the ones with no
 * visible text for a caller to pass in. They are English here so the package
 * still stands alone; an app that speaks more than one language overrides them
 * once with `UiLabelsProvider` instead of threading a prop through every call.
 */
export interface UiLabels {
  /** Clear control of a combobox field. */
  clear: string;
  /** Dismiss control of a sheet. */
  close: string;
  /** Busy state of a spinner. */
  loading: string;
  /** Collapsed overflow of a breadcrumb trail. */
  more: string;
  /** Control that opens a combobox popup. */
  open: string;
  /** Prefix of a chip's remove control, followed by the chip's own label. */
  remove: string;
  scrollToEnd: string;
  scrollToStart: string;
  /** Accessible name of the mobile sidebar dialog. */
  sidebar: string;
  sidebarDescription: string;
  /** Accessible name of a composer's suggested-prompt list. */
  suggestedPrompts: string;
  /** Announcement while an assistant works, and the words it cycles. */
  thinking: string;
  thinkingWords: string[];
  toggleSidebar: string;
}

const DEFAULT_UI_LABELS: UiLabels = {
  clear: "Clear",
  close: "Close",
  loading: "Loading",
  more: "More",
  open: "Open",
  remove: "Remove",
  scrollToEnd: "Scroll to end",
  scrollToStart: "Scroll to start",
  sidebar: "Sidebar",
  sidebarDescription: "Displays the mobile sidebar.",
  suggestedPrompts: "Suggested prompts",
  thinking: "Thinking…",
  thinkingWords: ["Thinking", "Planning", "Refining"],
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
