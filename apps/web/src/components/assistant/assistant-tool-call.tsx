import type { ToolUIPart } from "ai";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { assistantToolLabel } from "@/lib/assistant/tool-labels";
import { m } from "@/paraglide/messages.js";

interface AssistantToolCallProps {
  part: ToolUIPart;
}

/**
 * One lookup the assistant made, named in the reader's language. The figures
 * live in the answer's prose; this row exists so the reader can see which
 * question was put to their own data, and whether it succeeded.
 */
export const AssistantToolCall = ({ part }: AssistantToolCallProps) => {
  const stateLabels = {
    "approval-requested": m.assistant_tool_state_pending(),
    "approval-responded": m.assistant_tool_state_running(),
    "input-available": m.assistant_tool_state_running(),
    "input-streaming": m.assistant_tool_state_pending(),
    "output-available": m.assistant_tool_state_done(),
    "output-denied": m.assistant_tool_state_failed(),
    "output-error": m.assistant_tool_state_failed(),
  } satisfies Record<ToolUIPart["state"], string>;

  return (
    <Tool>
      <ToolHeader
        state={part.state}
        stateLabels={stateLabels}
        title={assistantToolLabel(part.type)}
        type={part.type}
      />
      <ToolContent>
        <ToolOutput
          errorLabel={m.assistant_tool_error()}
          errorText={part.errorText}
          output={
            part.state === "output-available" && m.assistant_tool_summary()
          }
          resultLabel={m.assistant_tool_result()}
        />
      </ToolContent>
    </Tool>
  );
};
