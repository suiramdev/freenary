import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { ScrollArea } from "@freenary/ui/components/scroll-area";
import { Spinner } from "@freenary/ui/components/spinner";
import { useSize } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiForbidLine,
  RiRefreshLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";

import { m } from "@/paraglide/messages.js";
import { remixIcon } from "@/shared/lib/remix-icon";

import { formatDuration } from "../lib/format-duration";
import type { ToolStatus } from "../model/execution";
import {
  assistantToolPurpose,
  toolParametersOf,
  toolResultSummary,
} from "../model/tool-details";
import { assistantToolLabel } from "../model/tool-labels";
import type { ExpandAll } from "../model/use-expand-all";
import { useExpandAll } from "../model/use-expand-all";

interface AssistantToolCallProps {
  part: ToolUIPart;
  status: ToolStatus;
  durationMs?: number;
  expanded?: ExpandAll;
  onRetry?: () => void;
}

const TRIGGER_PAD = { compact: "p-2.5", default: "p-3" } as const;
const PANEL_PAD = { compact: "px-3 pb-3", default: "px-4 pb-4" } as const;
const CODE_PAD = { compact: "p-2.5", default: "p-3" } as const;

const PAYLOAD_MAX_LINES = 12;
const LINE_HEIGHT_REM = 1.25;

const STATUS_LABELS = {
  cancelled: m.assistant_tool_state_cancelled,
  completed: m.assistant_tool_state_done,
  failed: m.assistant_tool_state_failed,
  preparing: m.assistant_tool_state_preparing,
  running: m.assistant_tool_state_running,
} satisfies Record<ToolStatus, () => string>;

const STATUS_ICONS = {
  cancelled: <RiForbidLine className="size-3.5" />,
  completed: <RiCheckboxCircleLine className="size-3.5 text-green-600" />,
  failed: <RiCloseCircleLine className="text-destructive size-3.5" />,
  preparing: <RiTimeLine className="size-3.5 animate-pulse" />,
  running: <Spinner className="size-3.5" />,
} satisfies Record<ToolStatus, ReactNode>;

const Payload = ({ code }: { code: string }) => {
  const size = useSize();

  return (
    <ScrollArea
      className="bg-muted/50 w-full overflow-hidden rounded-md border"
      orientation="both"
      style={{ maxHeight: `${PAYLOAD_MAX_LINES * LINE_HEIGHT_REM}rem` }}
      viewportClassName="!h-auto max-h-[inherit]"
    >
      <pre
        className={cn("font-mono leading-5", CODE_PAD[size.variant], size.text)}
      >
        <code>{code}</code>
      </pre>
    </ScrollArea>
  );
};

const Panel = ({
  children,
  heading,
}: {
  children: ReactNode;
  heading: string;
}) => (
  <div className="flex flex-col gap-2">
    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {heading}
    </h4>
    {children}
  </div>
);

const Parameters = ({ input }: { input: ToolUIPart["input"] }) => {
  const parameters = toolParametersOf(input);

  return (
    <Panel heading={m.assistant_tool_parameters()}>
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
    </Panel>
  );
};

const Outcome = ({
  errorText,
  output,
}: {
  errorText: ToolUIPart["errorText"];
  output: ToolUIPart["output"];
}) => {
  if (errorText) {
    return (
      <Panel heading={m.assistant_tool_error()}>
        <p className="text-destructive bg-destructive/10 rounded-md p-3 text-xs">
          {errorText}
        </p>
      </Panel>
    );
  }

  if (output === undefined || output === null) {
    return null;
  }

  return (
    <Panel heading={m.assistant_tool_result()}>
      <Payload code={JSON.stringify(output, null, 2)} />
    </Panel>
  );
};

export const AssistantToolCall = ({
  durationMs,
  expanded,
  onRetry,
  part,
  status,
}: AssistantToolCallProps) => {
  const [open, setOpen] = useExpandAll(expanded, status === "failed");
  const size = useSize();

  const purpose = assistantToolPurpose(part.type);
  const summary = status === "completed" ? toolResultSummary(part) : undefined;
  const settled = status === "completed" || status === "failed";

  return (
    <Collapsible
      className="w-full rounded-md border"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger
        chevron="trailing"
        className={cn(
          "items-center justify-between",
          size.gap,
          TRIGGER_PAD[size.variant]
        )}
      >
        <div className={cn("flex items-center", size.gap)}>
          <RiToolsLine className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">
            {assistantToolLabel(part.type)}
          </span>
          <Badge className="rounded-full">
            <span className="inline-flex items-center gap-1.5">
              {STATUS_ICONS[status]}
              {STATUS_LABELS[status]()}
              {durationMs !== undefined && (
                <span className="font-mono tabular-nums">
                  {formatDuration(durationMs)}
                </span>
              )}
            </span>
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="outline-none">
        <div className={cn("flex flex-col gap-3", PANEL_PAD[size.variant])}>
          {purpose && (
            <p className="text-muted-foreground text-xs">{purpose}</p>
          )}
          <Parameters input={part.input} />
          {part.input !== undefined && (
            <Panel heading={m.assistant_tool_raw_input()}>
              <Payload code={JSON.stringify(part.input, null, 2)} />
            </Panel>
          )}
          {summary && <p className="text-xs">{summary}</p>}
          {settled && (
            <Outcome
              errorText={part.errorText}
              output={status === "failed" ? undefined : part.output}
            />
          )}
          {status === "failed" && onRetry && (
            <div>
              <Button
                leadingIcon={remixIcon(RiRefreshLine)}
                onClick={onRetry}
                size="compact"
                variant="tertiary"
              >
                {m.assistant_retry()}
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
