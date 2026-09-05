import { Renderer } from "@openuidev/react-lang";
import type { ParseResult } from "@openuidev/react-lang";
import { useState } from "react";

import { assistantUiLibrary } from "@/components/assistant/assistant-ui-library";
import { m } from "@/paraglide/messages.js";

interface AssistantChartProps {
  /** The openui-lang program the model wrote inside its fence. */
  code: string;
  /** The fence is still open: the program grows with every chunk. */
  streaming: boolean;
}

/**
 * The parser is forgiving: an unknown component or a wrong argument drops the
 * child and records why, leaving a valid but empty Card. That is a broken
 * chart to the reader, not a chart.
 */
const isBroken = (result: ParseResult | null): boolean => {
  if (result?.root === null || result === null) {
    return true;
  }

  const { children } = result.root.props;

  return (
    result.meta.errors.length > 0 ||
    (Array.isArray(children) && children.length === 0)
  );
};

/**
 * One chart the assistant composed. The renderer re-parses the program on
 * every chunk and draws whatever already resolves; a program that is still
 * broken once the fence closed says so instead of leaving an empty card.
 */
export const AssistantChart = ({ code, streaming }: AssistantChartProps) => {
  // The result is keyed to the code it came from: the fence closes one render
  // before the renderer reports on the final program, and judging the previous
  // chunk's result in between would flash a failure for a chart that is fine.
  const [parsed, setParsed] = useState<{
    code: string;
    result: ParseResult | null;
  }>();
  const failed = !streaming && parsed?.code === code && isBroken(parsed.result);

  if (failed) {
    return (
      <p className="text-muted-foreground my-2 text-xs">
        {m.assistant_chart_failed()}
      </p>
    );
  }

  return (
    <div className="my-2">
      <Renderer
        isStreaming={streaming}
        library={assistantUiLibrary}
        onParseResult={(result) => setParsed({ code, result })}
        response={code}
      />
    </div>
  );
};
