export type AnswerSegment =
  | { kind: "markdown"; text: string }
  | { kind: "chart"; code: string; closed: boolean };

/** The opener the prompt asks for, with the shorter tag the model may drop to. */
const CHART_FENCE_OPEN = /^ {0,3}```[ \t]*openui(?:-lang)?[ \t]*$/u;
const FENCE_OPEN = /^ {0,3}```/u;
const FENCE_CLOSE = /^ {0,3}```[ \t]*$/u;
const CHART_FENCE_TAG = "```openui-lang";

const pushMarkdown = (segments: AnswerSegment[], lines: string[]) => {
  const text = lines.join("\n").trim();
  if (text.length > 0) {
    segments.push({ kind: "markdown", text });
  }
  lines.length = 0;
};

/**
 * Splits an answer's text into the prose the markdown renderer gets and the
 * fenced `openui-lang` programs the chart renderer gets. Any other fence stays
 * markdown, closing backticks included. The text is re-split on every streamed
 * chunk, so a fence still open at the end is a chart in progress, and a last
 * line that may still grow into the chart opener is held back rather than
 * flashed as a code block. Line endings may be CRLF: nothing between the
 * provider and here normalises them.
 */
export const splitAnswer = (text: string): AnswerSegment[] => {
  const segments: AnswerSegment[] = [];
  const lines = text.split(/\r?\n/u);
  const complete = text.endsWith("\n");
  const pending: string[] = [];
  let fence: "none" | "other" | "chart" = "none";

  for (const [index, line] of lines.entries()) {
    const last = index === lines.length - 1;

    if (fence === "chart") {
      if (FENCE_CLOSE.test(line)) {
        segments.push({
          closed: true,
          code: pending.join("\n"),
          kind: "chart",
        });
        pending.length = 0;
        fence = "none";
      } else {
        pending.push(line);
      }
      continue;
    }

    if (fence === "other") {
      pending.push(line);
      if (FENCE_CLOSE.test(line)) {
        fence = "none";
      }
      continue;
    }

    if (CHART_FENCE_OPEN.test(line)) {
      pushMarkdown(segments, pending);
      fence = "chart";
      continue;
    }

    if (last && !complete && CHART_FENCE_TAG.startsWith(line.trimStart())) {
      // "``" or "```openui-la" mid-stream: neither prose nor a fence yet.
      break;
    }

    pending.push(line);
    if (FENCE_OPEN.test(line)) {
      fence = "other";
    }
  }

  if (fence === "chart") {
    segments.push({ closed: false, code: pending.join("\n"), kind: "chart" });
  } else {
    pushMarkdown(segments, pending);
  }

  return segments;
};
