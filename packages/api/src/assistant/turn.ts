import type {
  ReasoningUIPart,
  StepStartUIPart,
  TextUIPart,
  ToolUIPart,
  UIMessage,
} from "ai";

/**
 * What a stored turn is made of, shared by the server route and the browser
 * transport: both run the same tool loop and store the same shape, so the rules
 * for what a turn may hold live in one browser-safe module.
 */

/** A question longer than this is a paste, not a question. */
export const MAX_QUESTION_CHARS = 8000;
/** Tool calls a single answer may chain before it has to conclude. */
export const MAX_STEPS = 6;

/** Two letters, optionally a region: what `getLocale()` produces. */
export const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/u;

/** A date as the prompt states it: YYYY-MM-DD, or null when there is none. */
export const isoDay = (date: Date | string | null): string | null =>
  date === null ? null : new Date(date).toISOString().slice(0, 10);

/**
 * The parts a text-and-tools answer is made of, which is all either model
 * loop emits and all `assistant.saveTurn` accepts. A file, a source or a data
 * part has no reader here and is dropped before storage.
 */
export type StoredPart =
  | ReasoningUIPart
  | StepStartUIPart
  | TextUIPart
  | ToolUIPart;

export const isStoredPart = (
  part: UIMessage["parts"][number]
): part is StoredPart =>
  part.type === "text" ||
  part.type === "reasoning" ||
  part.type === "step-start" ||
  part.type.startsWith("tool-");

/**
 * A tool call the stream never resolved cannot be replayed: `convertToModelMessages`
 * emits its `tool-call` with no matching result, which an OpenAI-compatible
 * endpoint rejects — poisoning every later turn in the conversation.
 */
export const answerableParts = (
  parts: UIMessage["parts"]
): UIMessage["parts"] =>
  parts.filter(
    (part) =>
      !part.type.startsWith("tool-") ||
      !("state" in part) ||
      part.state === "output-available" ||
      part.state === "output-error"
  );

/**
 * Whether anything a reader would see survived. A stopped stream still emits a
 * `step-start` marker, so counting parts would store a turn holding nothing —
 * and the next request would replay that emptiness to the model.
 */
export const hasContent = (parts: UIMessage["parts"]): boolean =>
  parts.some(
    (part) =>
      part.type.startsWith("tool-") ||
      (part.type === "text" && part.text.trim().length > 0)
  );

/**
 * A run only failed if it ended in an error. `other` is not a failure: it is
 * what the OpenAI-compatible mapper returns for any `finish_reason` it does not
 * recognise — Together's `eos` for a finished answer lands there — so refusing
 * it would silently discard every turn on such an endpoint.
 */
const FAILED_REASON = "error";

/**
 * Whether a finished run produced a turn worth storing. A failed or abandoned
 * answer must not be: it would be replayed to the model on every later turn.
 * `outcome.status` cannot tell — a provider failure mid-answer still ends
 * `completed`, because the trailing `finish` chunk overwrites the failed
 * outcome — so the reason the run reports is the signal, and a run that
 * reported none never finished. A `length`-capped answer is kept: the reader
 * saw that text.
 */
export const isStorableOutcome = ({
  finishReason,
  isAborted,
  parts,
}: {
  finishReason: string | undefined;
  isAborted: boolean;
  parts: UIMessage["parts"];
}): boolean =>
  !(
    isAborted ||
    finishReason === undefined ||
    finishReason === FAILED_REASON ||
    !hasContent(parts)
  );

interface StoredRow {
  id: string;
  role: "USER" | "ASSISTANT";
}

/**
 * The rows a regenerate replaces. The SDK names the assistant message it is
 * redoing, and a streamed answer carries its stored row's id, so the anchor is
 * exact: no guessing from the transcript's shape, which drifts the moment one
 * turn is stopped, and no matching on text, which collides when the same
 * question is asked twice. Only the trailing turn can be redone; anything else
 * appends.
 */
export const regeneratedTurnIds = (
  stored: readonly StoredRow[],
  regeneratedMessageId: string | undefined
): string[] => {
  const trailingAnswer = stored.at(-1);
  const trailingQuestion = stored.at(-2);

  return regeneratedMessageId !== undefined &&
    trailingAnswer?.id === regeneratedMessageId &&
    trailingAnswer.role === "ASSISTANT" &&
    trailingQuestion?.role === "USER"
    ? [trailingQuestion.id, trailingAnswer.id]
    : [];
};
