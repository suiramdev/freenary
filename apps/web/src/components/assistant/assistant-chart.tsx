import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@freenary/ui/components/sheet";
import { Renderer } from "@openuidev/react-lang";
import type { ParseResult } from "@openuidev/react-lang";
import { RiBarChartBoxLine, RiFullscreenLine } from "@remixicon/react";
import { useState } from "react";

import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
 * One chart the assistant composed, as an artifact the reader can open large.
 * The renderer re-parses the program on every chunk and draws whatever already
 * resolves; a program that is still broken once the fence closed says so
 * instead of leaving an empty card.
 */
export const AssistantChart = ({ code, streaming }: AssistantChartProps) => {
  // The result is keyed to the code it came from: the fence closes one render
  // before the renderer reports on the final program, and judging the previous
  // chunk's result in between would flash a failure for a chart that is fine.
  const [parsed, setParsed] = useState<{
    code: string;
    result: ParseResult | null;
  }>();
  const [large, setLarge] = useState(false);
  const failed = !streaming && parsed?.code === code && isBroken(parsed.result);

  if (failed) {
    return (
      <p className="text-muted-foreground my-2 text-xs">
        {m.assistant_chart_failed()}
      </p>
    );
  }

  return (
    <Artifact className="my-2">
      <ArtifactHeader>
        <ArtifactTitle>
          <RiBarChartBoxLine className="size-3.5" />
          {m.assistant_chart_label()}
          {streaming && (
            <Shimmer as="span" duration={1.5}>
              {m.assistant_chart_drawing()}
            </Shimmer>
          )}
        </ArtifactTitle>
        <ArtifactActions>
          <ArtifactAction
            disabled={streaming}
            label={m.assistant_chart_expand()}
            onClick={() => setLarge(true)}
            tooltip={m.assistant_chart_expand()}
          >
            <RiFullscreenLine className="size-3.5" />
          </ArtifactAction>
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <Renderer
          isStreaming={streaming}
          library={assistantUiLibrary}
          onParseResult={(result) => setParsed({ code, result })}
          response={code}
        />
      </ArtifactContent>
      <Sheet onOpenChange={setLarge} open={large}>
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{m.assistant_chart_label()}</SheetTitle>
            <SheetDescription className="sr-only">
              {m.assistant_chart_expand()}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto p-4 text-sm [&_[data-slot=chart].w-full]:h-80">
            {/* A second renderer over the same program: the chart takes the
                sheet's width and a taller slot. */}
            <Renderer library={assistantUiLibrary} response={code} />
          </div>
        </SheetContent>
      </Sheet>
    </Artifact>
  );
};
