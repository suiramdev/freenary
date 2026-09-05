import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { useSyncExternalStore } from "react";

import { WebLlmLanguageModel } from "./language-model";
import type { BrowserModel } from "./models";
import { browserModels } from "./models";
// eslint-disable-next-line import/default -- Vite's `?worker` import yields a Worker constructor the import plugin cannot see
import EngineWorker from "./worker?worker";

/**
 * Where the browser model stands. One engine per page, shared by every mount
 * of the assistant: loading a model costs a download the first time and a GPU
 * upload every time, so navigating away must not throw it out.
 */
export type BrowserModelStatus =
  | { phase: "idle" }
  | { phase: "loading"; modelId: string; progress: number; text: string }
  | { phase: "ready"; modelId: string }
  | { phase: "error"; modelId: string; message: string };

const IDLE: BrowserModelStatus = { phase: "idle" };

/**
 * The system prompt, the tool signatures and a few tool results outgrow
 * WebLLM's 4096 default within two lookups. WebLLM's `vram_required_MB` was
 * measured at 4096; `models.ts` adds the KV cache the extra tokens cost, and
 * `transport.ts` trims the transcript to this many tokens.
 */
export const CONTEXT_WINDOW_SIZE = 8192;

let status: BrowserModelStatus = IDLE;
let engine: WebWorkerMLCEngine | null = null;
let languageModel: WebLlmLanguageModel | null = null;
const listeners = new Set<() => void>();

const setStatus = (next: BrowserModelStatus) => {
  status = next;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useBrowserModel = (): BrowserModelStatus =>
  useSyncExternalStore(
    subscribe,
    () => status,
    () => IDLE
  );

/**
 * WebGPU is the whole requirement: no adapter, no browser model. Client-only:
 * `useWebGpuSupport` is what a component asks, and it answers null on the
 * server and during hydration so the two renders cannot disagree.
 */
const hasWebGpu = (): boolean => "gpu" in navigator;

export const useWebGpuSupport = (): boolean | null =>
  useSyncExternalStore(subscribe, hasWebGpu, () => null);

/** The library is 6 MB of JavaScript: fetched when a reader opts in, not before. */
const webllm = () => import("@mlc-ai/web-llm");

/**
 * The models this device can run, resolved against the installed WebLLM. A
 * GPU without `shader-f16` gets the f32 builds; the picker never offers a
 * build the adapter would refuse.
 */
export const browserModelCatalog = async (): Promise<BrowserModel[]> => {
  const [{ prebuiltAppConfig }, adapter] = await Promise.all([
    webllm(),
    navigator.gpu.requestAdapter(),
  ]);
  return browserModels(
    prebuiltAppConfig,
    adapter?.features.has("shader-f16") ?? false,
    CONTEXT_WINDOW_SIZE
  );
};

/** The model as the SDK sees it, or null until one is ready. */
export const browserLanguageModel = (): WebLlmLanguageModel | null =>
  status.phase === "ready" ? languageModel : null;

/**
 * Loads a model into the GPU, downloading it from the Hugging Face CDN the
 * first time. Progress reaches the store as WebLLM reports it. A second call
 * while one is loading is ignored: WebLLM serialises reloads on its own lock,
 * and two overlapping progress streams would fight over the same status.
 */
export const loadBrowserModel = async (modelId: string): Promise<void> => {
  if (status.phase === "loading") {
    return;
  }
  // Still in the GPU from an earlier choice: nothing to load again.
  if (languageModel?.modelId === modelId) {
    setStatus({ modelId, phase: "ready" });
    return;
  }

  setStatus({ modelId, phase: "loading", progress: 0, text: "" });
  languageModel = null;

  const report = ({ progress, text }: { progress: number; text: string }) => {
    setStatus({ modelId, phase: "loading", progress, text });
  };

  try {
    const { CreateWebWorkerMLCEngine } = await webllm();
    const chatOpts = { context_window_size: CONTEXT_WINDOW_SIZE };

    if (engine) {
      engine.setInitProgressCallback(report);
      await engine.reload(modelId, chatOpts);
    } else {
      engine = await CreateWebWorkerMLCEngine(
        new EngineWorker(),
        modelId,
        { initProgressCallback: report, logLevel: "WARN" },
        chatOpts
      );
    }

    languageModel = new WebLlmLanguageModel(engine, modelId);
    setStatus({ modelId, phase: "ready" });
  } catch (error) {
    // A device lost mid-load (usually out of memory) leaves the engine with
    // half a model; unloading it lets the next attempt start clean. A failed
    // unload adds nothing to the error already in hand.
    try {
      await engine?.unload();
    } catch {
      // The device is gone either way.
    }
    setStatus({
      message: error instanceof Error ? error.message : String(error),
      modelId,
      phase: "error",
    });
  }
};
