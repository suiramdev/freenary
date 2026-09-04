"use client";

import { Badge } from "@freenary/ui/components/badge";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import {
  RiCheckboxCircleLine,
  RiCircleLine,
  RiCloseCircleLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import type { ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export interface ToolHeaderProps {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  /** One label per state; the app owns the wording so it can be translated. */
  stateLabels: Record<ToolUIPart["state"], string>;
  className?: string;
}

const getStatusBadge = (
  status: ToolUIPart["state"],
  stateLabels: Record<ToolUIPart["state"], string>
) => {
  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "approval-requested": <RiTimeLine className="size-4 text-yellow-600" />,
    "approval-responded": (
      <RiCheckboxCircleLine className="size-4 text-blue-600" />
    ),
    "input-available": <RiTimeLine className="size-4 animate-pulse" />,
    "input-streaming": <RiCircleLine className="size-4" />,
    "output-available": (
      <RiCheckboxCircleLine className="size-4 text-green-600" />
    ),
    "output-denied": <RiCloseCircleLine className="size-4 text-orange-600" />,
    "output-error": <RiCloseCircleLine className="size-4 text-red-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {stateLabels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  stateLabels,
  ...props
}: ToolHeaderProps) => (
  // `CollapsibleTrigger` draws its own chevron, so this row adds none.
  <CollapsibleTrigger
    // No `justify-between`: the trigger's own chevron is the first child, so
    // spreading would push the label and badge to the far edge.
    className={cn("flex w-full items-center gap-2 p-3", className)}
    {...props}
  >
    <div className="flex items-center gap-2">
      <RiToolsLine className="text-muted-foreground size-4" />
      <span className="text-sm font-medium">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      {getStatusBadge(state, stateLabels)}
    </div>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsiblePanel>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsiblePanel
    // The primitive owns the open/close transition; the vendor's `data-[state=…]`
    // utilities are Radix names that never match Base UI's `data-open`.
    className={cn("text-popover-foreground outline-none", className)}
    {...props}
  />
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
  /** Heading shown above a successful result; the app translates it. */
  resultLabel: string;
  /** Heading shown above a failure; the app translates it. */
  errorLabel: string;
};

export const ToolOutput = ({
  className,
  errorLabel,
  errorText,
  output,
  resultLabel,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {errorText ? errorLabel : resultLabel}
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
        <div>{output as ReactNode}</div>
      </div>
    </div>
  );
};
