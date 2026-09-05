import type { UIMessage } from "ai";

/**
 * Characters per token the budget assumes. Real ratios run 3.5 to 4.5 for
 * English prose and lower for the JSON tool results a transcript is mostly
 * made of; three is the conservative end, so the estimate errs towards
 * dropping a turn early rather than overflowing the window.
 */
const CHARS_PER_TOKEN = 3;

/** Tokens kept free for the model's own answer and its tool calls. */
const ANSWER_RESERVE_TOKENS = 1536;

/**
 * Characters the prompt may hold before the answer's reserve is threatened,
 * for a window of `contextWindowSize` tokens.
 */
export const promptBudgetChars = (contextWindowSize: number): number =>
  (contextWindowSize - ANSWER_RESERVE_TOKENS) * CHARS_PER_TOKEN;

/** Roughly what a message costs once rendered into the prompt. */
export const messageChars = (message: UIMessage): number =>
  JSON.stringify(message.parts).length;

/**
 * The newest turns of a transcript that fit beside a prompt of `fixedChars`.
 * A hosted endpoint has a window large enough that the server replays the
 * whole transcript; a browser model has 8192 tokens, three thousand of which
 * the system prompt and the tool signatures take, so a conversation with a
 * few lookup-heavy turns has to shed its oldest ones or WebLLM refuses the
 * request outright. Turns leave as question-and-answer pairs, oldest first,
 * so the model never sees an answer without its question.
 */
export const fitHistory = (
  history: UIMessage[],
  fixedChars: number,
  budgetChars: number
): UIMessage[] => {
  let remaining = budgetChars - fixedChars;
  let start = history.length;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (!message) {
      break;
    }
    remaining -= messageChars(message);
    if (remaining < 0) {
      break;
    }
    start = index;
  }

  // Never begin on an answer: step forward to the next question.
  while (start < history.length && history[start]?.role !== "user") {
    start += 1;
  }

  return history.slice(start);
};
