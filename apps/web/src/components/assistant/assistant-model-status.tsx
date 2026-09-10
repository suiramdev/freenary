import { Button } from "@freenary/ui/components/button";

import type { BrowserModelStatus } from "@/lib/assistant/browser/engine";
import { loadBrowserModel } from "@/lib/assistant/browser/engine";
import { SERVER_MODEL } from "@/lib/assistant/model-choice";
import { m } from "@/paraglide/messages.js";

interface AssistantModelStatusProps {
  browserModel: BrowserModelStatus;
  /** `SERVER_MODEL`, a WebLLM id, or null when nothing is chosen yet. */
  selected: string | null;
  webGpu: boolean | null;
}

/**
 * What the chosen model is doing, in one line above the composer. It carries
 * what the model button cannot: why no model is chosen yet, and why the
 * chosen one failed. A model that is loading shows in the button itself, and
 * a model that is ready is already named there.
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
