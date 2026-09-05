import type { AssistantToolName } from "@freenary/api/assistant/tools";
import { Button } from "@freenary/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
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
import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolError,
  ToolHeader,
  ToolSection,
  ToolStatusBadge,
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
import { m } from "@/paraglide/messages.js";

interface AssistantToolCallProps {
  part: ToolUIPart;
  status: ToolStatus;
  /** Measured on the live turn only; a replayed transcript has none. */
  durationMs?: number;
  /** Set by "Expand all" / "Collapse all"; a click on the row overrides it. */
  expanded?: { value: boolean; tick: number };
  /** Redo the whole turn; offered on a failed lookup of the last answer. */
  onRetry?: () => void;
  /** A line between the row and its sections, such as the step's note. */
  children?: ReactNode;
}

const TOOL_ICONS = {
  get_accounts_overview: <RiBankLine className="size-4" />,
  get_budget_vs_actual: <RiScalesLine className="size-4" />,
  get_cash_flow: <RiLineChartLine className="size-4" />,
  get_fixed_vs_variable: <RiPieChartLine className="size-4" />,
  get_recurring_expenses: <RiRepeatLine className="size-4" />,
  get_spending_by_group: <RiBarChartBoxLine className="size-4" />,
  search_transactions: <RiSearchLine className="size-4" />,
} satisfies Record<AssistantToolName, ReactNode>;

/** The icon a timeline draws beside a lookup row. */
export const assistantToolIcon = (part: ToolUIPart): ReactNode => {
  const name = assistantToolNameOf(part.type);
  return name ? TOOL_ICONS[name] : <RiToolsLine className="size-4" />;
};

const STATUS_LABELS = {
  cancelled: m.assistant_tool_state_cancelled,
  completed: m.assistant_tool_state_done,
  failed: m.assistant_tool_state_failed,
  preparing: m.assistant_tool_state_preparing,
  running: m.assistant_tool_state_running,
} satisfies Record<ToolStatus, () => string>;

const STATUS_ICONS = {
  cancelled: <RiForbidLine className="size-3" />,
  completed: <RiCheckboxCircleLine className="size-3 text-green-600" />,
  failed: <RiCloseCircleLine className="size-3" />,
  preparing: <RiTimeLine className="size-3 animate-pulse" />,
  running: <Spinner className="size-3" />,
} satisfies Record<ToolStatus, ReactNode>;

const STATUS_BADGE_CLASS = {
  cancelled: "text-muted-foreground",
  completed: "",
  failed: "bg-destructive/10 text-destructive",
  preparing: "",
  running: "text-primary",
} satisfies Record<ToolStatus, string>;

/** A raw JSON view, closed by default so the card stays readable. */
const RawView = ({
  copiedLabel,
  copyLabel,
  heading,
  value,
}: {
  copiedLabel: string;
  copyLabel: string;
  heading: string;
  value: ToolUIPart["input"] | ToolUIPart["output"];
}) => {
  const json = JSON.stringify(value, null, 2) ?? "";
  return (
    <Collapsible>
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-fit rounded-md py-0.5 text-xs transition-colors duration-150 ease-out outline-none focus-visible:ring-[3px]">
          {heading}
        </CollapsibleTrigger>
        {/* Outside the panel, so it works while the raw view is closed. */}
        <CodeBlockCopyButton
          code={json}
          copiedLabel={copiedLabel}
          label={copyLabel}
        />
      </div>
      <CollapsiblePanel className="outline-none">
        <CodeBlock className="mt-2" code={json} />
      </CollapsiblePanel>
    </Collapsible>
  );
};

/**
 * One lookup the assistant made: what it is for, what it was asked with,
 * how it went and what came back. The figures live in the answer's prose;
 * this card exists so the reader can check which question was put to their
 * own data, with which arguments, and whether it succeeded.
 */
export const AssistantToolCall = ({
  children,
  durationMs,
  expanded,
  onRetry,
  part,
  status,
}: AssistantToolCallProps) => {
  // The card's own toggle records which "Expand all" press it came after; a
  // newer press wins until the card is toggled again. Derived, not synced.
  const [toggle, setToggle] = useState<{ open: boolean; tick?: number }>();
  const open =
    toggle && toggle.tick === expanded?.tick
      ? toggle.open
      : (expanded?.value ?? status === "failed");
  const setOpen = (next: boolean) =>
    setToggle({ open: next, tick: expanded?.tick });

  const parameters = toolParametersOf(part.input);
  const summary = status === "completed" ? toolResultSummary(part) : undefined;

  return (
    <Tool onOpenChange={setOpen} open={open}>
      <ToolHeader
        badge={
          <ToolStatusBadge
            className={STATUS_BADGE_CLASS[status]}
            icon={STATUS_ICONS[status]}
          >
            {STATUS_LABELS[status]()}
          </ToolStatusBadge>
        }
        description={assistantToolPurpose(part.type)}
        meta={durationMs === undefined ? undefined : formatDuration(durationMs)}
        title={assistantToolLabel(part.type)}
      />
      {children}
      <ToolContent>
        <ToolSection heading={m.assistant_tool_parameters()}>
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
          {part.input !== undefined && (
            <RawView
              copiedLabel={m.assistant_copied()}
              copyLabel={m.assistant_copy_input()}
              heading={m.assistant_tool_raw_input()}
              value={part.input}
            />
          )}
        </ToolSection>
        {(status === "completed" || status === "failed") && (
          <ToolSection
            actions={
              status === "failed" && onRetry ? (
                <Button onClick={onRetry} size="sm" variant="ghost">
                  <RiRefreshLine className="size-3" />
                  {m.assistant_retry()}
                </Button>
              ) : undefined
            }
            heading={
              status === "failed"
                ? m.assistant_tool_error()
                : m.assistant_tool_result()
            }
          >
            {status === "failed" ? (
              <ToolError>{part.errorText}</ToolError>
            ) : (
              <>
                {summary && <p className="text-xs">{summary}</p>}
                <RawView
                  copiedLabel={m.assistant_copied()}
                  copyLabel={m.assistant_copy_output()}
                  heading={m.assistant_tool_raw_output()}
                  value={part.output}
                />
              </>
            )}
          </ToolSection>
        )}
      </ToolContent>
    </Tool>
  );
};
