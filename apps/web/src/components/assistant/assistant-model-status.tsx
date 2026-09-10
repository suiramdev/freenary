import { Button } from "@freenary/ui/components/button";

import type { BrowserModelStatus } from "@/lib/assistant/browser/engine";
import { loadBrowserModel } from "@/lib/assistant/browser/engine";
import { SERVER_MODEL } from "@/lib/assistant/model-choice";
import { m } from "@/paraglide/messages.js";

interface AssistantModelStatusProps {
  browserModel: BrowserModelStatus;
  selected: string | null;
  webGpu: boolean | null;
}

export const AssistantModelStatus = ({
  browserModel,
  selected,
  webGpu,
}: AssistantModelStatusProps) => {
  const nothingChosenYet = selected === null;
  const webGpuUnknown = webGpu === null;

  if (selected === SERVER_MODEL || webGpuUnknown) {
    return null;
  }

  if (nothingChosenYet) {
    return (
      <p className="text-muted-foreground text-center text-xs">
        {webGpu
          ? m.assistant_model_none_chosen()
          : m.assistant_browser_no_webgpu()}
      </p>
    );
  }

  const chosenModelFailed =
    browserModel.phase === "error" && browserModel.modelId === selected;

  if (chosenModelFailed) {
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
          size="compact"
          variant="ghost"
        >
          {m.assistant_retry()}
        </Button>
      </div>
    );
  }

  return null;
};
