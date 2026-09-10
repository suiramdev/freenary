"use client";

// From the AI Elements registry, on the Base UI collapsible and the Remix
// icons; the wording it renders is a prop, so the app can translate it.

import { Badge } from "@freenary/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import {
  RiArrowDownSLine,
  RiCheckboxCircleLine,
  RiCircleLine,
  RiCloseCircleLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import type { ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  /** Replaces the badge the SDK state alone would give; `null` draws none. */
  badge?: ReactNode;
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "input-streaming": <RiCircleLine className="size-4" />,
    "input-available": <RiTimeLine className="size-4 animate-pulse" />,
    "approval-requested": <RiTimeLine className="size-4 text-yellow-600" />,
    "approval-responded": (
      <RiCheckboxCircleLine className="size-4 text-blue-600" />
    ),
    "output-available": (
      <RiCheckboxCircleLine className="size-4 text-green-600" />
    ),
    "output-error": <RiCloseCircleLine className="size-4 text-red-600" />,
    "output-denied": <RiCloseCircleLine className="size-4 text-orange-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  badge,
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <RiToolsLine className="text-muted-foreground size-4" />
      <span className="text-sm font-medium">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      {badge === undefined ? getStatusBadge(state) : badge}
    </div>
    <RiArrowDownSLine className="text-muted-foreground size-4 transition-transform group-data-panel-open/collapsible-trigger:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn("text-popover-foreground outline-none", className)}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
  title?: string;
};

export const ToolInput = ({
  className,
  input,
  title = "Parameters",
  ...props
}: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {title}
    </h4>
    <div className="bg-muted/50 rounded-md">
      <CodeBlock code={JSON.stringify(input, null, 2)} />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
  title?: string;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  title = errorText ? "Error" : "Result",
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} />;
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
