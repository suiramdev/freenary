import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4FinishReason,
  LanguageModelV4FunctionTool,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4Usage,
  SharedV4Warning,
} from "@ai-sdk/provider";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";

import type { ParsedEvent } from "./tool-protocol";
import { toChatMessages, ToolCallParser } from "./tool-protocol";

/**
 * Ties a request's parts together: the SDK expects a distinct id per text or
 * reasoning run, and the parser can switch between them several times in one
 * answer.
 */
interface OpenPart {
  id: string;
  kind: "text" | "reasoning";
}

const usageOf = (usage?: {
  completion_tokens: number;
  prompt_tokens: number;
}): LanguageModelV4Usage => ({
  inputTokens: {
    cacheRead: undefined,
    cacheWrite: undefined,
    noCache: undefined,
    total: usage?.prompt_tokens,
  },
  outputTokens: {
    reasoning: undefined,
    text: undefined,
    total: usage?.completion_tokens,
  },
});

const finishReasonOf = (
  raw: string | null | undefined,
  calledTools: boolean
): LanguageModelV4FinishReason => {
  if (calledTools) {
    return { raw: raw ?? undefined, unified: "tool-calls" };
  }
  switch (raw) {
    case "stop": {
      return { raw, unified: "stop" };
    }
    case "length": {
      return { raw, unified: "length" };
    }
    default: {
      return { raw: raw ?? undefined, unified: "other" };
    }
  }
};

/**
 * A WebLLM engine as an AI SDK language model. Every request streams: WebLLM
 * generates token by token either way, and one path keeps the tool-call
 * parsing in one place.
 */
export class WebLlmLanguageModel implements LanguageModelV4 {
  readonly specificationVersion = "v4";
  readonly provider = "webllm";
  readonly supportedUrls = {};
  readonly modelId: string;
  private readonly engine: MLCEngineInterface;

  constructor(engine: MLCEngineInterface, modelId: string) {
    this.engine = engine;
    this.modelId = modelId;
  }

  async doGenerate(
    options: LanguageModelV4CallOptions
  ): Promise<LanguageModelV4GenerateResult> {
    const { stream } = await this.doStream(options);
    const content: LanguageModelV4Content[] = [];
    const texts = new Map<
      string,
      { kind: "text" | "reasoning"; text: string }
    >();
    let finishReason: LanguageModelV4FinishReason = {
      raw: undefined,
      unified: "other",
    };
    let usage = usageOf();
    let warnings: SharedV4Warning[] = [];

    for await (const part of stream) {
      switch (part.type) {
        case "stream-start": {
          ({ warnings } = part);
          break;
        }
        case "text-start":
        case "reasoning-start": {
          texts.set(part.id, {
            kind: part.type === "text-start" ? "text" : "reasoning",
            text: "",
          });
          break;
        }
        case "text-delta":
        case "reasoning-delta": {
          const open = texts.get(part.id);
          if (open) {
            open.text += part.delta;
          }
          break;
        }
        case "text-end":
        case "reasoning-end": {
          const open = texts.get(part.id);
          if (open) {
            content.push({ text: open.text, type: open.kind });
            texts.delete(part.id);
          }
          break;
        }
        case "tool-call": {
          content.push(part);
          break;
        }
        case "finish": {
          ({ finishReason, usage } = part);
          break;
        }
        case "error": {
          throw part.error;
        }
        default: {
          break;
        }
      }
    }

    return { content, finishReason, usage, warnings };
  }

  async doStream(
    options: LanguageModelV4CallOptions
  ): Promise<LanguageModelV4StreamResult> {
    const { abortSignal, maxOutputTokens, prompt, temperature, toolChoice } =
      options;
    const warnings: SharedV4Warning[] = [];
    const tools: LanguageModelV4FunctionTool[] = [];

    for (const tool of options.tools ?? []) {
      if (tool.type === "function") {
        tools.push(tool);
      } else {
        warnings.push({
          details: "Provider-defined tools cannot run in the browser.",
          feature: `tool ${tool.id}`,
          type: "unsupported",
        });
      }
    }

    if (options.responseFormat?.type === "json") {
      warnings.push({
        details: "JSON output is not enforced by the browser model.",
        feature: "responseFormat",
        type: "unsupported",
      });
    }

    const messages = toChatMessages(prompt, tools, toolChoice);
    const { engine } = this;

    const chunks = await engine.chat.completions.create({
      // Qwen3 thinks before every answer unless told not to; on a laptop GPU
      // that is a minute per lookup, for a question the tools answer anyway.
      extra_body: { enable_thinking: false },
      max_tokens: maxOutputTokens,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature,
    });

    const parser = new ToolCallParser();
    let open: OpenPart | null = null;
    let calledTools = false;
    let rawFinish: string | null | undefined;
    let usage: { completion_tokens: number; prompt_tokens: number } | undefined;

    const onAbort = () => {
      engine.interruptGenerate();
    };
    abortSignal?.addEventListener("abort", onAbort, { once: true });

    const stream = new ReadableStream<LanguageModelV4StreamPart>({
      async start(controller) {
        const close = () => {
          if (open) {
            controller.enqueue({
              id: open.id,
              type: open.kind === "text" ? "text-end" : "reasoning-end",
            });
            open = null;
          }
        };
        const emit = (kind: "text" | "reasoning", delta: string) => {
          if (open && open.kind !== kind) {
            close();
          }
          // Qwen3 with thinking off still writes an empty `<think>` block, and
          // a newline or two after it; a part holding only whitespace would
          // show as "Thought" or as an empty answer row.
          if (!open && delta.trim().length === 0) {
            return;
          }
          if (!open) {
            open = { id: crypto.randomUUID(), kind };
            controller.enqueue({
              id: open.id,
              type: kind === "text" ? "text-start" : "reasoning-start",
            });
          }
          controller.enqueue({
            delta,
            id: open.id,
            type: kind === "text" ? "text-delta" : "reasoning-delta",
          });
        };
        const handle = (events: ParsedEvent[]) => {
          for (const event of events) {
            if (event.kind === "tool-call") {
              close();
              calledTools = true;
              const id = `call_${crypto.randomUUID()}`;
              controller.enqueue({
                id,
                toolName: event.name,
                type: "tool-input-start",
              });
              controller.enqueue({
                delta: event.input,
                id,
                type: "tool-input-delta",
              });
              controller.enqueue({ id, type: "tool-input-end" });
              controller.enqueue({
                input: event.input,
                toolCallId: id,
                toolName: event.name,
                type: "tool-call",
              });
            } else {
              emit(event.kind, event.delta);
            }
          }
        };

        controller.enqueue({ type: "stream-start", warnings });

        try {
          for await (const chunk of chunks) {
            const [choice] = chunk.choices;
            if (choice?.delta.content) {
              handle(parser.push(choice.delta.content));
            }
            if (choice?.finish_reason) {
              rawFinish = choice.finish_reason;
            }
            if (chunk.usage) {
              ({ usage } = chunk);
            }
          }
          handle(parser.end());
          close();
          controller.enqueue({
            finishReason: finishReasonOf(
              abortSignal?.aborted ? "abort" : rawFinish,
              calledTools
            ),
            type: "finish",
            usage: usageOf(usage),
          });
        } catch (error) {
          controller.enqueue({ error, type: "error" });
        } finally {
          abortSignal?.removeEventListener("abort", onAbort);
          controller.close();
        }
      },
    });

    return { stream };
  }
}
