import { Match } from "effect";

import { Shimmer } from "@/components/ai-elements/shimmer";
import type { Activity } from "@/lib/assistant/execution";
import { assistantToolLabel } from "@/lib/assistant/tool-labels";
import { m } from "@/paraglide/messages.js";

interface AssistantActivityProps {
  activity: Activity;
  retrying: boolean;
}

const SHIMMER_DURATION_SECONDS = 1.5;

const activityLabel = (
  activity: NonNullable<Activity>,
  retrying: boolean
): string =>
  Match.value(activity).pipe(
    Match.discriminatorsExhaustive("kind")({
      drawing: () => m.assistant_activity_drawing(),
      preparing: () => m.assistant_activity_preparing(),
      running: ({ parallel, tool }) =>
        parallel > 1
          ? m.assistant_activity_running_parallel({
              count: parallel - 1,
              tool: assistantToolLabel(tool.type),
            })
          : `${assistantToolLabel(tool.type)}…`,
      thinking: () =>
        retrying
          ? m.assistant_activity_retrying()
          : m.assistant_activity_thinking(),
      writing: () => m.assistant_activity_writing(),
    })
  );

export const AssistantActivity = ({
  activity,
  retrying,
}: AssistantActivityProps) => {
  if (!activity) {
    return null;
  }

  return (
    <output aria-live="polite" className="text-muted-foreground block text-xs">
      <Shimmer as="span" duration={SHIMMER_DURATION_SECONDS}>
        {activityLabel(activity, retrying)}
      </Shimmer>
    </output>
  );
};
