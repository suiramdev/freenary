import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@freenary/env/server";

/**
 * The assistant needs somewhere to send the request and something to ask for.
 * A key is optional: a local runtime (Ollama, LM Studio) has none, and defaulting
 * either of the other two would make an unconfigured instance look connected.
 */
export const isAssistantConfigured = (): boolean =>
  env.AI_BASE_URL !== undefined && env.AI_MODEL !== undefined;

/**
 * The id the reader sees in the model picker, so a choice between the hosted
 * model and one on their device is a choice between two named things.
 */
export const assistantModelId = (): string | null =>
  isAssistantConfigured() ? (env.AI_MODEL ?? null) : null;

export const assistantModel = () => {
  if (!(env.AI_BASE_URL && env.AI_MODEL)) {
    return null;
  }

  const provider = createOpenAICompatible({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL,
    name: "freenary-assistant",
  });

  return provider.chatModel(env.AI_MODEL);
};
