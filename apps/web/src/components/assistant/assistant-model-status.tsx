import { Button } from "@freenary/ui/components/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@freenary/ui/components/progress";
import { RiCpuLine } from "@remixicon/react";

import type { BrowserModelStatus } from "@/lib/assistant/browser/engine";
import { loadBrowserModel } from "@/lib/assistant/browser/engine";
import { browserModelLabel } from "@/lib/assistant/browser/models";
import { SERVER_MODEL } from "@/lib/assistant/model-choice";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

const percent = (fraction: number): string =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(fraction);

interface AssistantModelStatusProps {
  browserModel: BrowserModelStatus;
  /** `SERVER_MODEL`, a WebLLM id, or null when nothing is chosen yet. */
  selected: string | null;
  webGpu: boolean | null;
}

/**
 * What the chosen model is doing, under the composer. The hosted model needs
 * no line; a device model reports its download, its failure, or that it is
 * the one answering — a reader who sees an answer from a 4B model deserves
 * to know it was not the operator's endpoint.
 */
export const AssistantModelStatus = ({
  browserModel,
  selected,
  webGpu,
}: AssistantModelStatusProps) => {
  if (selected === SERVER_MODEL || webGpu === null) {
    return null;
  }

  if (selected === null) {
    return (
      <p className="text-muted-foreground text-center text-xs">
        {webGpu
          ? m.assistant_model_none_chosen()
          : m.assistant_browser_no_webgpu()}
      </p>
    );
  }

  if (browserModel.phase === "loading" && browserModel.modelId === selected) {
    return (
      <Progress
        aria-label={m.assistant_browser_loading({
          model: browserModelLabel(selected),
        })}
        className="mx-auto w-full max-w-sm"
        value={browserModel.progress * 100}
      >
        <ProgressLabel className="text-xs">
          {m.assistant_browser_loading({ model: browserModelLabel(selected) })}
        </ProgressLabel>
        <ProgressValue className="text-xs">
          {() => percent(browserModel.progress)}
        </ProgressValue>
      </Progress>
    );
  }

  if (browserModel.phase === "error" && browserModel.modelId === selected) {
    return (
      <div
        className="text-destructive flex items-center justify-center gap-2 text-xs"
        role="alert"
      >
        <span>
          {m.assistant_browser_load_failed({ reason: browserModel.message })}
        </span>
        <Button
          onClick={() => loadBrowserModel(selected)}
          size="xs"
          variant="link"
        >
          {m.assistant_retry()}
        </Button>
      </div>
    );
  }

  if (browserModel.phase === "ready" && browserModel.modelId === selected) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <RiCpuLine aria-hidden="true" className="size-3.5" />
        <span>
          {m.assistant_browser_running({ model: browserModelLabel(selected) })}
        </span>
      </div>
    );
  }

  return null;
};
