import { Shimmer } from "@/components/ai-elements/shimmer";
import type { Activity } from "@/lib/assistant/execution";
import { assistantToolLabel } from "@/lib/assistant/tool-labels";
import { m } from "@/paraglide/messages.js";

interface AssistantActivityProps {
  activity: Activity;
  /** The turn is a retry of the last one, so the first wait reads as such. */
  retrying: boolean;
}

const labelOf = (activity: NonNullable<Activity>, retrying: boolean) => {
  switch (activity.kind) {
    case "thinking": {
      return retrying
        ? m.assistant_activity_retrying()
        : m.assistant_activity_thinking();
    }
    case "preparing": {
      return m.assistant_activity_preparing();
    }
    case "running": {
      return activity.parallel > 1
        ? m.assistant_activity_running_parallel({
            count: activity.parallel - 1,
            tool: assistantToolLabel(activity.tool.type),
          })
        : `${assistantToolLabel(activity.tool.type)}…`;
    }
    case "writing": {
      return m.assistant_activity_writing();
    }
    case "drawing": {
      return m.assistant_activity_drawing();
    }
    default: {
      return "";
    }
  }
};

/**
 * One line naming what the assistant is doing right now. It is the same
 * information the trace shows, put where the reader's eye is: under the
 * newest content. Gone the moment the answer is complete. The shimmer is its
 * only motion: the mark and the active step's spinner already move.
 */
export const AssistantActivity = ({
  activity,
  retrying,
}: AssistantActivityProps) => {
  if (!activity) {
    return null;
  }

  return (
    <output aria-live="polite" className="text-muted-foreground block text-xs">
      <Shimmer as="span" duration={1.5}>
        {labelOf(activity, retrying)}
      </Shimmer>
    </output>
  );
};
