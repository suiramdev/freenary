import { Button } from "@freenary/ui/components/button";
import {
  CommandMenu,
  CommandMenuDialog,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "@freenary/ui/components/command-menu";
import type { CommandMenuItemData } from "@freenary/ui/components/command-menu";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiCpuLine, RiExpandUpDownLine, RiServerLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { browserModelCatalog } from "@/lib/assistant/browser/engine";
import { browserModelLabel } from "@/lib/assistant/browser/models";
import { SERVER_MODEL } from "@/lib/assistant/model-choice";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

const MB_PER_GB = 1024;

const gigabytes = (mb: number): string =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
    style: "unit",
    unit: "gigabyte",
  }).format(mb / MB_PER_GB);

const percent = (fraction: number): string =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(fraction);

interface AssistantModelSelectorProps {
  /** Neither the picker nor the engine may change mid-answer. */
  disabled: boolean;
  /**
   * Download progress of the chosen device model, `undefined` unless one is
   * loading. While it loads there is nothing to pick, so it takes the
   * button's place.
   */
  loadingProgress?: number;
  onSelect: (modelId: string) => void;
  /** `SERVER_MODEL`, a WebLLM id, or null when nothing is chosen yet. */
  selected: string | null;
  serverModel: string | null;
  /** Null until the client knows; false hides the device group's models. */
  webGpu: boolean | null;
}

/**
 * The one place a reader picks what answers: the model the instance hosts,
 * or one WebLLM runs on their own graphics card. Picking a device model
 * starts its download, which the button itself then reports.
 */
export const AssistantModelSelector = ({
  disabled,
  loadingProgress,
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

  const pick = useCallback(
    (modelId: string) => {
      onSelect(modelId);
      setOpen(false);
    },
    [onSelect]
  );

  // CommandMenu wants a stable items array: the highlight resets when the
  // array identity changes.
  const items = useMemo<CommandMenuItemData[]>(() => {
    const rows: CommandMenuItemData[] = [];
    if (serverModel !== null) {
      rows.push({
        group: m.assistant_model_server_group(),
        icon: remixIcon(RiServerLine),
        label: serverModel,
        onSelect: () => pick(SERVER_MODEL),
        value: SERVER_MODEL,
      });
    }
    if (webGpu === true && catalog.data) {
      for (const model of catalog.data) {
        rows.push({
          description: gigabytes(model.vramMb),
          group: m.assistant_model_device_group(),
          icon: remixIcon(RiCpuLine),
          keywords: [model.id],
          label: model.label,
          onSelect: () => pick(model.id),
          value: model.id,
        });
      }
    }
    return rows;
  }, [serverModel, webGpu, catalog.data, pick]);

  // `resolveModelChoice` only yields the server when the instance has one.
  let label: string = m.assistant_model_choose();
  if (selected === SERVER_MODEL && serverModel !== null) {
    label = serverModel;
  } else if (selected !== null && selected !== SERVER_MODEL) {
    label = browserModelLabel(selected);
  }
  const hasOptions = serverModel !== null || webGpu === true;

  // A model that is still arriving cannot answer, so the button reports the
  // download instead of opening the palette. No `aria-busy`: it would tell a
  // screen reader to defer the spinner's own `role="status"`, and the flag
  // never clears — the button unmounts when the load ends.
  if (loadingProgress !== undefined) {
    return (
      <PromptInputButton disabled>
        <Spinner className="size-4" />
        <span className="max-w-40 truncate">
          {m.assistant_browser_loading({ model: label })}
        </span>
        <span className="tabular-nums">{percent(loadingProgress)}</span>
      </PromptInputButton>
    );
  }

  return (
    <>
      <PromptInputButton
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {selected === SERVER_MODEL ? (
          <RiServerLine className="size-4" />
        ) : (
          <RiCpuLine className="size-4" />
        )}
        <span className="max-w-40 truncate">{label}</span>
        <RiExpandUpDownLine className="size-3.5 opacity-60" />
      </PromptInputButton>
      <CommandMenuDialog
        className="sm:max-w-lg"
        onOpenChange={setOpen}
        open={open}
        shortcut={null}
        title={m.assistant_model_label()}
      >
        <CommandMenu items={items}>
          <CommandMenuInput placeholder={m.assistant_model_search()} />
          <CommandMenuList>
            {hasOptions && (
              <CommandMenuEmpty>{m.assistant_model_none()}</CommandMenuEmpty>
            )}
            {webGpu === true && catalog.isPending && (
              <div className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5 text-xs">
                <Spinner className="size-3.5" />
                {m.assistant_browser_catalog_loading()}
              </div>
            )}
            {webGpu === true && catalog.isError && (
              <div
                className="text-destructive flex items-center gap-2 px-2.5 py-1.5 text-xs"
                role="alert"
              >
                <span>{m.assistant_model_catalog_failed()}</span>
                <Button
                  className="underline underline-offset-4"
                  onClick={() => catalog.refetch()}
                  size="compact"
                  variant="ghost"
                >
                  {m.assistant_retry()}
                </Button>
              </div>
            )}
          </CommandMenuList>
        </CommandMenu>
      </CommandMenuDialog>
    </>
  );
};
