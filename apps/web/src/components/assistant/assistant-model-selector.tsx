import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiCpuLine, RiExpandUpDownLine, RiServerLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { browserModelCatalog } from "@/lib/assistant/browser/engine";
import type { BrowserModel } from "@/lib/assistant/browser/models";
import { browserModelLabel } from "@/lib/assistant/browser/models";
import { SERVER_MODEL } from "@/lib/assistant/model-choice";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

const MB_PER_GB = 1024;

const gigabytes = (mb: number): string =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
    style: "unit",
    unit: "gigabyte",
  }).format(mb / MB_PER_GB);

interface AssistantModelSelectorProps {
  /** Neither the picker nor the engine may change mid-answer. */
  disabled: boolean;
  onSelect: (modelId: string) => void;
  /** `SERVER_MODEL`, a WebLLM id, or null when nothing is chosen yet. */
  selected: string | null;
  serverModel: string | null;
  /** Null until the client knows; false hides the device group's models. */
  webGpu: boolean | null;
}

const DeviceModels = ({
  models,
  onSelect,
  selected,
}: {
  models: BrowserModel[];
  onSelect: (modelId: string) => void;
  selected: string | null;
}) =>
  models.map((model) => (
    <ModelSelectorItem
      data-checked={model.id === selected}
      key={model.id}
      onSelect={() => onSelect(model.id)}
      value={`${model.label} ${model.id}`}
    >
      <RiCpuLine />
      <ModelSelectorName>{model.label}</ModelSelectorName>
      <span className="text-muted-foreground tabular-nums">
        {gigabytes(model.vramMb)}
      </span>
    </ModelSelectorItem>
  ));

/**
 * The one place a reader picks what answers: the model the instance hosts,
 * or one WebLLM runs on their own graphics card. Picking a device model
 * starts its download; the status line under the composer reports it.
 */
export const AssistantModelSelector = ({
  disabled,
  onSelect,
  selected,
  serverModel,
  webGpu,
}: AssistantModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const catalog = useQuery({
    // The catalogue needs the GPU adapter; asking without one rejects.
    enabled: open && webGpu === true,
    queryFn: browserModelCatalog,
    queryKey: ["assistant", "browser-models"],
    staleTime: Number.POSITIVE_INFINITY,
  });

  const pick = (modelId: string) => {
    onSelect(modelId);
    setOpen(false);
  };

  // `resolveModelChoice` only yields the server when the instance has one.
  let label: string = m.assistant_model_choose();
  if (selected === SERVER_MODEL && serverModel !== null) {
    label = serverModel;
  } else if (selected !== null && selected !== SERVER_MODEL) {
    label = browserModelLabel(selected);
  }
  const hasOptions = serverModel !== null || webGpu === true;

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger render={<PromptInputButton disabled={disabled} />}>
        {selected === SERVER_MODEL ? (
          <RiServerLine className="size-4" />
        ) : (
          <RiCpuLine className="size-4" />
        )}
        <span className="max-w-40 truncate">{label}</span>
        <RiExpandUpDownLine className="size-3.5 opacity-60" />
      </ModelSelectorTrigger>
      <ModelSelectorContent title={m.assistant_model_label()}>
        <ModelSelectorInput placeholder={m.assistant_model_search()} />
        <ModelSelectorList>
          {hasOptions && (
            <ModelSelectorEmpty>{m.assistant_model_none()}</ModelSelectorEmpty>
          )}
          {serverModel !== null && (
            <ModelSelectorGroup heading={m.assistant_model_server_group()}>
              <ModelSelectorItem
                data-checked={selected === SERVER_MODEL}
                onSelect={() => pick(SERVER_MODEL)}
                value={`${SERVER_MODEL} ${serverModel}`}
              >
                <RiServerLine />
                <ModelSelectorName>{serverModel}</ModelSelectorName>
              </ModelSelectorItem>
            </ModelSelectorGroup>
          )}
          {webGpu === true && (
            <ModelSelectorGroup heading={m.assistant_model_device_group()}>
              {catalog.data && (
                <DeviceModels
                  models={catalog.data}
                  onSelect={pick}
                  selected={selected}
                />
              )}
              {catalog.isPending && (
                <div className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5 text-xs">
                  <Spinner className="size-3.5" />
                  {m.assistant_browser_catalog_loading()}
                </div>
              )}
              {catalog.isError && (
                <div
                  className="text-destructive flex items-center gap-2 px-2.5 py-1.5 text-xs"
                  role="alert"
                >
                  <span>{m.assistant_model_catalog_failed()}</span>
                  <Button
                    onClick={() => catalog.refetch()}
                    size="xs"
                    variant="link"
                  >
                    {m.assistant_retry()}
                  </Button>
                </div>
              )}
            </ModelSelectorGroup>
          )}
        </ModelSelectorList>
        <p className="text-muted-foreground border-t px-3 py-2 text-xs">
          {webGpu === false
            ? m.assistant_browser_no_webgpu()
            : m.assistant_model_device_hint()}
        </p>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
