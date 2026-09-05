import type {
  LanguageModelV4FunctionTool,
  LanguageModelV4Prompt,
  LanguageModelV4ToolChoice,
  LanguageModelV4ToolResultOutput,
} from "@ai-sdk/provider";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { z } from "zod";

/**
 * Tool calling over plain text, in the `<tool_call>` dialect Qwen, Hermes and
 * SmolLM were trained on. WebLLM's own `tools` field is not usable here: it
 * accepts five 8B Hermes builds only, forbids a system prompt beside the tools,
 * and forces every answer through a JSON grammar — so a model could call a
 * tool but never write the sentence that follows. Prompting the protocol keeps
 * one loop for every model and lets the same answer hold both.
 */

const TOOL_CALL_OPEN = "<tool_call>";
const TOOL_CALL_CLOSE = "</tool_call>";
const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

const OPENING_TAGS = [TOOL_CALL_OPEN, THINK_OPEN] as const;

const toolSignature = (tool: LanguageModelV4FunctionTool): string =>
  JSON.stringify({
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.inputSchema,
    },
    type: "function",
  });

/** The section appended to the system prompt when tools are offered. */
export const toolInstructions = (
  tools: readonly LanguageModelV4FunctionTool[],
  toolChoice: LanguageModelV4ToolChoice | undefined
): string =>
  [
    "# Tools",
    "",
    "You may call one or more functions to assist with the user query.",
    "",
    "You are provided with function signatures within <tools></tools> XML tags:",
    "<tools>",
    ...tools.map(toolSignature),
    "</tools>",
    "",
    "For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:",
    TOOL_CALL_OPEN,
    '{"name": <function-name>, "arguments": <args-json-object>}',
    TOOL_CALL_CLOSE,
    "",
    "Each result comes back inside <tool_response></tool_response> XML tags in the next user message. Once you have the results you need, answer the user in prose and call no further function; never call a function again with the same arguments, and never write a <tool_response> yourself.",
    ...(toolChoice?.type === "required"
      ? ["You must call at least one function before answering."]
      : []),
    ...(toolChoice?.type === "tool"
      ? [`You must call the function named ${toolChoice.toolName}.`]
      : []),
  ].join("\n");

const toolResultText = (output: LanguageModelV4ToolResultOutput): string => {
  switch (output.type) {
    case "text":
    case "error-text": {
      return output.value;
    }
    case "json":
    case "error-json": {
      return JSON.stringify(output.value);
    }
    case "execution-denied": {
      return JSON.stringify({ error: output.reason ?? "execution denied" });
    }
    case "content": {
      return output.value
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("\n");
    }
    default: {
      return "";
    }
  }
};

/**
 * The SDK prompt as WebLLM chat messages. Tool calls become text inside the
 * assistant's own turn and tool results a user turn, which is the shape the
 * models saw in training — and the one WebLLM's templates can render, since
 * most of them have no `tool` role.
 */
export const toChatMessages = (
  prompt: LanguageModelV4Prompt,
  tools: readonly LanguageModelV4FunctionTool[],
  toolChoice: LanguageModelV4ToolChoice | undefined
): ChatCompletionMessageParam[] => {
  const messages: ChatCompletionMessageParam[] = [];
  const offered = toolChoice?.type === "none" ? [] : tools;
  const system = prompt.find((message) => message.role === "system");
  const instructions = [
    ...(system ? [system.content] : []),
    ...(offered.length > 0 ? [toolInstructions(offered, toolChoice)] : []),
  ].join("\n\n");

  if (instructions.length > 0) {
    messages.push({ content: instructions, role: "system" });
  }

  for (const message of prompt) {
    switch (message.role) {
      case "user": {
        messages.push({
          content: message.content
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("\n"),
          role: "user",
        });
        break;
      }
      case "assistant": {
        const lines: string[] = [];
        for (const part of message.content) {
          if (part.type === "text") {
            lines.push(part.text);
          } else if (part.type === "tool-call") {
            lines.push(
              `${TOOL_CALL_OPEN}\n${JSON.stringify({ arguments: part.input, name: part.toolName })}\n${TOOL_CALL_CLOSE}`
            );
          }
        }
        messages.push({ content: lines.join("\n"), role: "assistant" });
        break;
      }
      case "tool": {
        const responses = message.content
          .filter((part) => part.type === "tool-result")
          .map(
            (part) =>
              `<tool_response>\n${JSON.stringify({ content: toolResultText(part.output), name: part.toolName })}\n</tool_response>`
          );
        messages.push({ content: responses.join("\n"), role: "user" });
        break;
      }
      default: {
        break;
      }
    }
  }

  return messages;
};

export type ParsedEvent =
  | { kind: "text"; delta: string }
  | { kind: "reasoning"; delta: string }
  | { kind: "tool-call"; name: string; input: string };

const longestTagPrefix = (text: string): number => {
  let longest = 0;
  for (const tag of [...OPENING_TAGS, THINK_CLOSE, TOOL_CALL_CLOSE]) {
    const max = Math.min(tag.length - 1, text.length);
    for (let length = max; length > longest; length -= 1) {
      if (text.endsWith(tag.slice(0, length))) {
        longest = length;
        break;
      }
    }
  }
  return longest;
};

/**
 * What a `<tool_call>` body must hold. Models trained on the protocol emit the
 * arguments as an object; a few wrap them in a JSON string, which is accepted
 * and unwrapped.
 */
const toolCallBodySchema = z.object({
  arguments: z
    .union([z.record(z.string(), z.unknown()), z.string()])
    .optional(),
  name: z.string().min(1),
});

/**
 * One `<tool_call>` body as the SDK wants it: the arguments object as a JSON
 * string. A body that is not a call at all is returned as `null` so it stays
 * prose.
 */
const parseToolCall = (
  body: string
): { input: string; name: string } | null => {
  let json: unknown;
  try {
    json = JSON.parse(body.trim());
  } catch {
    return null;
  }
  const parsed = toolCallBodySchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  const { arguments: args = {}, name } = parsed.data;
  const wrapped = z.string().safeParse(args);
  if (!wrapped.success) {
    return { input: JSON.stringify(args), name };
  }
  try {
    JSON.parse(wrapped.data);
    return { input: wrapped.data, name };
  } catch {
    return { input: "{}", name };
  }
};

/**
 * Splits the model's text as it streams into prose, reasoning and tool calls.
 * Tags can arrive split across chunks, so a trailing fragment that could still
 * become a tag is held back until the next delta settles it.
 */
export class ToolCallParser {
  private buffer = "";
  private mode: "text" | "reasoning" | "tool-call" = "text";

  push(delta: string): ParsedEvent[] {
    this.buffer += delta;
    const events: ParsedEvent[] = [];

    for (;;) {
      if (this.mode === "tool-call") {
        const end = this.buffer.indexOf(TOOL_CALL_CLOSE);
        if (end === -1) {
          return events;
        }
        const call = parseToolCall(this.buffer.slice(0, end));
        events.push(
          call
            ? { kind: "tool-call", ...call }
            : {
                delta: `${TOOL_CALL_OPEN}${this.buffer.slice(0, end)}${TOOL_CALL_CLOSE}`,
                kind: "text",
              }
        );
        this.buffer = this.buffer.slice(end + TOOL_CALL_CLOSE.length);
        this.mode = "text";
        continue;
      }

      const closing = this.mode === "reasoning" ? THINK_CLOSE : undefined;
      const next = this.nextTag(closing);

      if (next === null) {
        const held = longestTagPrefix(this.buffer);
        const emit = this.buffer.slice(0, this.buffer.length - held);
        this.buffer = this.buffer.slice(this.buffer.length - held);
        if (emit.length > 0) {
          events.push({ delta: emit, kind: this.currentKind() });
        }
        return events;
      }

      const before = this.buffer.slice(0, next.index);
      if (before.length > 0) {
        events.push({ delta: before, kind: this.currentKind() });
      }
      this.buffer = this.buffer.slice(next.index + next.tag.length);

      if (next.tag === TOOL_CALL_OPEN) {
        this.mode = "tool-call";
      } else if (next.tag === THINK_OPEN) {
        this.mode = "reasoning";
      } else {
        this.mode = "text";
      }
    }
  }

  /** Whatever is still held once the model stopped: it was never a tag. */
  end(): ParsedEvent[] {
    if (this.buffer.length === 0) {
      return [];
    }
    const rest = this.buffer;
    this.buffer = "";
    if (this.mode === "tool-call") {
      this.mode = "text";
      return [{ delta: `${TOOL_CALL_OPEN}${rest}`, kind: "text" }];
    }
    return [{ delta: rest, kind: this.currentKind() }];
  }

  private currentKind(): "text" | "reasoning" {
    return this.mode === "reasoning" ? "reasoning" : "text";
  }

  private nextTag(
    closing: string | undefined
  ): { index: number; tag: string } | null {
    const candidates = closing ? [closing, TOOL_CALL_OPEN] : OPENING_TAGS;
    let found: { index: number; tag: string } | null = null;
    for (const tag of candidates) {
      const index = this.buffer.indexOf(tag);
      if (index !== -1 && (found === null || index < found.index)) {
        found = { index, tag };
      }
    }
    return found;
  }
}
