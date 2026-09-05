import type { AppConfig } from "@mlc-ai/web-llm";

/**
 * A model the assistant can run in the browser. WebLLM's prebuilt list holds
 * over a hundred builds, most of which were never trained to call a tool; the
 * assistant answers from tools alone, so only families that follow the
 * `<tool_call>` protocol in `tool-protocol.ts` are offered. Every build is
 * served from the Hugging Face CDN under `mlc-ai/`.
 */
export interface BrowserModel {
  /** WebLLM's `model_id`, quantisation suffix included. */
  id: string;
  label: string;
  /**
   * Memory the GPU must hold: WebLLM's figure for the weights and its default
   * window, plus the KV cache the assistant's longer window adds. An estimate,
   * as WebLLM's own figure is.
   */
  vramMb: number;
}

interface CatalogEntry {
  /** `model_id` without the quantisation suffix. */
  base: string;
  label: string;
}

/** Ordered by size within a family, so the picker reads small to large. */
const CATALOG: readonly CatalogEntry[] = [
  { base: "Qwen3-1.7B", label: "Qwen3 1.7B" },
  { base: "Qwen3-4B", label: "Qwen3 4B" },
  { base: "Qwen3-8B", label: "Qwen3 8B" },
  { base: "Qwen3.5-2B", label: "Qwen3.5 2B" },
  { base: "Qwen3.5-4B", label: "Qwen3.5 4B" },
  { base: "Qwen3.5-9B", label: "Qwen3.5 9B" },
  { base: "Qwen2.5-3B-Instruct", label: "Qwen2.5 3B" },
  { base: "Qwen2.5-7B-Instruct", label: "Qwen2.5 7B" },
  { base: "Hermes-3-Llama-3.2-3B", label: "Hermes 3 (Llama 3.2 3B)" },
  { base: "Hermes-3-Llama-3.1-8B", label: "Hermes 3 (Llama 3.1 8B)" },
  { base: "Llama-3.2-3B-Instruct", label: "Llama 3.2 3B" },
  { base: "Llama-3.1-8B-Instruct", label: "Llama 3.1 8B" },
];

/** The catalog label for a stored id, or the id itself for a build no longer listed. */
export const browserModelLabel = (id: string): string =>
  CATALOG.find((entry) => id.startsWith(`${entry.base}-`))?.label ?? id;

/** The window WebLLM measured `vram_required_MB` at, for every listed build. */
const MEASURED_WINDOW_TOKENS = 4096;

/**
 * KV cache per token for the largest attention stack in the catalog, Qwen3
 * 4B and 8B: 2 (keys and values) x 36 layers x 8 KV heads x 128 dimensions,
 * times the bytes per value. Every other listed family stores less, so the
 * allowance rounds up rather than down.
 */
const KV_VALUES_PER_TOKEN = 2 * 36 * 8 * 128;
const MB = 1024 * 1024;

/**
 * The catalog resolved against WebLLM's prebuilt list. `f16` picks the
 * half-precision build a GPU with `shader-f16` runs faster and in less memory;
 * the others get the f32 build, which is the same weights at a higher cost and
 * a KV cache twice the size. An entry the installed WebLLM no longer ships is
 * dropped rather than offered.
 */
export const browserModels = (
  appConfig: AppConfig,
  f16: boolean,
  contextWindowSize: number
): BrowserModel[] => {
  const suffix = f16 ? "-q4f16_1-MLC" : "-q4f32_1-MLC";
  const bytesPerValue = f16 ? 2 : 4;
  const extraWindowMb =
    (Math.max(0, contextWindowSize - MEASURED_WINDOW_TOKENS) *
      KV_VALUES_PER_TOKEN *
      bytesPerValue) /
    MB;
  const models: BrowserModel[] = [];

  for (const entry of CATALOG) {
    const id = `${entry.base}${suffix}`;
    const record = appConfig.model_list.find(
      (candidate) => candidate.model_id === id
    );
    if (record) {
      models.push({
        id,
        label: entry.label,
        vramMb: Math.round((record.vram_required_MB ?? 0) + extraWindowMb),
      });
    }
  }

  return models.toSorted((a, b) => a.vramMb - b.vramMb);
};
