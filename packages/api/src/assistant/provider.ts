import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@freenary/env/server";

export const isAssistantConfigured = (): boolean =>
  env.AI_BASE_URL !== undefined && env.AI_MODEL !== undefined;

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
