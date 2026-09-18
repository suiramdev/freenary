import { ThinkingIndicator } from "@freenary/ui/components/thinking-indicator";
import { Match } from "effect";

import type { Activity } from "@/lib/assistant/execution";
import { assistantToolLabel } from "@/lib/assistant/tool-labels";
import { m } from "@/paraglide/messages.js";

interface AssistantActivityProps {
  activity: Activity;
  retrying: boolean;
}

const labelOf = (
  activity: NonNullable<Activity>,
  retrying: boolean
): string | undefined =>
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
      thinking: () => (retrying ? m.assistant_activity_retrying() : undefined),
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

  const label = labelOf(activity, retrying);

  return (
    <ThinkingIndicator
      aria-live="polite"
      className="px-0 py-0"
      showIcon={false}
      size="compact"
      words={label === undefined ? undefined : [label]}
    />
  );
};
