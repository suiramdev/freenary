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
  program: string;
  streaming: boolean;
}

interface ProgramParse {
  program: string;
  result: ParseResult | null;
}

const SHIMMER_DURATION_SECONDS = 1.5;

const isBroken = (result: ParseResult | null): boolean => {
  if (result === null || result.root === null) {
    return true;
  }

  const { children } = result.root.props;
  const everyChildDropped = Array.isArray(children) && children.length === 0;

  return result.meta.errors.length > 0 || everyChildDropped;
};

export const AssistantChart = ({ program, streaming }: AssistantChartProps) => {
  const [parsed, setParsed] = useState<ProgramParse>();
  const [large, setLarge] = useState(false);
  const failed =
    !streaming &&
    parsed !== undefined &&
    parsed.program === program &&
    isBroken(parsed.result);

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
            <Shimmer as="span" duration={SHIMMER_DURATION_SECONDS}>
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
          onParseResult={(result) => setParsed({ program, result })}
          response={program}
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
            <Renderer library={assistantUiLibrary} response={program} />
          </div>
        </SheetContent>
      </Sheet>
    </Artifact>
  );
};
