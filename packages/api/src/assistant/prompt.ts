export interface AssistantPromptContext {
  /** BCP-47 tag the answer must be written in; the server cannot infer it. */
  locale: string;
  /** Today, as YYYY-MM-DD, so relative periods resolve without a clock tool. */
  today: string;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
  hasAccounts: boolean;
}

const DATA_RANGE_UNAVAILABLE = "No bank account is connected yet.";

export const assistantSystemPrompt = ({
  firstTransactionDate,
  hasAccounts,
  lastTransactionDate,
  locale,
  today,
}: AssistantPromptContext): string => {
  const range =
    hasAccounts && firstTransactionDate && lastTransactionDate
      ? `Transaction data covers ${firstTransactionDate} to ${lastTransactionDate}; refuse periods outside it instead of extrapolating.`
      : DATA_RANGE_UNAVAILABLE;

  return [
    "You are Freenary's financial assistant. Freenary holds this user's bank accounts, transactions and budget plan.",
    `Answer in the user's language: ${locale}.`,
    `Today is ${today}.`,
    "Never state a figure you did not get from a tool. Call the tools, then answer from their results.",
    "Amounts in tool results are integer minor units — divide by 100 and present them in euros unless a result names another currency.",
    'Categories and category groups come back as stable slugs such as "daily-living" or "eating-out"; name them naturally in the user\'s language, never as a slug.',
    range,
    "If no bank account is connected, say so and point the user to Settings → Bank accounts.",
    "Be brief: two or three sentences, then the numbers that support them.",
    "You provide information and arithmetic, never regulated financial advice.",
  ].join("\n");
};
