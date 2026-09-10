import type { AssistantToolName } from "@freenary/api/assistant/tools";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import {
  RiBankLine,
  RiBarChartBoxLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiForbidLine,
  RiLineChartLine,
  RiPieChartLine,
  RiRefreshLine,
  RiRepeatLine,
  RiScalesLine,
  RiSearchLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { ToolStatus } from "@/lib/assistant/execution";
import { formatDuration } from "@/lib/assistant/format-duration";
import {
  assistantToolNameOf,
  assistantToolPurpose,
  toolParametersOf,
  toolResultSummary,
} from "@/lib/assistant/tool-details";
import { assistantToolLabel } from "@/lib/assistant/tool-labels";
import type { ExpandAll } from "@/lib/assistant/use-expand-all";
import { useExpandAll } from "@/lib/assistant/use-expand-all";
import { m } from "@/paraglide/messages.js";

interface AssistantToolCallProps {
  part: ToolUIPart;
  status: ToolStatus;
  /** Measured on the live turn only; a replayed transcript has none. */
  durationMs?: number;
  /** Set by "Expand all" / "Collapse all"; a click on the row overrides it. */
  expanded?: ExpandAll;
  /** Redo the whole turn; offered on a failed lookup of the last answer. */
  onRetry?: () => void;
}

const TOOL_ICONS = {
  get_accounts_overview: RiBankLine,
  get_budget_vs_actual: RiScalesLine,
  get_cash_flow: RiLineChartLine,
  get_fixed_vs_variable: RiPieChartLine,
  get_recurring_expenses: RiRepeatLine,
  get_spending_by_group: RiBarChartBoxLine,
  search_transactions: RiSearchLine,
} satisfies Record<AssistantToolName, RemixiconComponentType>;

/** The icon a timeline draws beside a step that made this lookup. */
export const assistantToolIcon = (part: ToolUIPart): RemixiconComponentType => {
  const name = assistantToolNameOf(part.type);
  return name ? TOOL_ICONS[name] : RiToolsLine;
};

/**
 * The badge is the app's, not the SDK state's: the SDK never writes
 * "cancelled", and the reader's language does not come from a state name.
 */
const STATUS_LABELS = {
  cancelled: m.assistant_tool_state_cancelled,
  completed: m.assistant_tool_state_done,
  failed: m.assistant_tool_state_failed,
  preparing: m.assistant_tool_state_preparing,
  running: m.assistant_tool_state_running,
} satisfies Record<ToolStatus, () => string>;

const STATUS_ICONS = {
  cancelled: <RiForbidLine className="size-4" />,
  completed: <RiCheckboxCircleLine className="size-4 text-green-600" />,
  failed: <RiCloseCircleLine className="text-destructive size-4" />,
  preparing: <RiTimeLine className="size-4 animate-pulse" />,
  running: <Spinner className="size-4" />,
} satisfies Record<ToolStatus, ReactNode>;

const Parameters = ({ input }: { input: ToolUIPart["input"] }) => {
  const parameters = toolParametersOf(input);
  return (
    <div className="flex flex-col gap-2 p-4 pb-0">
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {m.assistant_tool_parameters()}
      </h4>
      {parameters.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {parameters.map((parameter) => (
            <div className="contents" key={parameter.label}>
              <dt className="text-muted-foreground">{parameter.label}</dt>
              <dd className="min-w-0 truncate">{parameter.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted-foreground text-xs">
          {m.assistant_tool_no_parameters()}
        </p>
      )}
    </div>
  );
};

/**
 * One lookup the assistant made: what it is for, what it was asked with,
 * how it went and what came back. The figures live in the answer's prose;
 * this card exists so the reader can check which question was put to their
 * own data, with which arguments, and whether it succeeded.
 */
export const AssistantToolCall = ({
  durationMs,
  expanded,
  onRetry,
  part,
  status,
}: AssistantToolCallProps) => {
  // A failed lookup opens by itself: its error is the thing to read.
  const [open, setOpen] = useExpandAll(expanded, status === "failed");

  const purpose = assistantToolPurpose(part.type);
  const summary = status === "completed" ? toolResultSummary(part) : undefined;
  const settled = status === "completed" || status === "failed";

  return (
    <Tool className="mb-0" onOpenChange={setOpen} open={open}>
      <ToolHeader
        badge={
          <Badge className="gap-1.5 rounded-full text-xs">
            {STATUS_ICONS[status]}
            {STATUS_LABELS[status]()}
            {durationMs !== undefined && (
              <span className="font-mono tabular-nums">
                {formatDuration(durationMs)}
              </span>
            )}
          </Badge>
        }
        state={part.state}
        title={assistantToolLabel(part.type)}
        type={part.type}
      />
      <ToolContent>
        {purpose && (
          <p className="text-muted-foreground p-4 pb-0 text-xs">{purpose}</p>
        )}
        <Parameters input={part.input} />
        {part.input !== undefined && (
          <ToolInput input={part.input} title={m.assistant_tool_raw_input()} />
        )}
        {summary && <p className="p-4 pb-0 text-xs">{summary}</p>}
        {settled && (
          <ToolOutput
            errorText={part.errorText}
            output={status === "failed" ? undefined : part.output}
            title={
              status === "failed"
                ? m.assistant_tool_error()
                : m.assistant_tool_result()
            }
          />
        )}
        {status === "failed" && onRetry && (
          <div className="p-4 pt-0">
            <Button onClick={onRetry} size="sm" variant="tertiary">
              <RiRefreshLine className="size-3" />
              {m.assistant_retry()}
            </Button>
          </div>
        )}
      </ToolContent>
    </Tool>
  );
};
