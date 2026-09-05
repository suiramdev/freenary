"use client";

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import { RiGitCommitLine } from "@remixicon/react";
import type { ComponentProps, ReactNode } from "react";

/**
 * The step timeline. One Base UI collapsible owns the open state, so the
 * header is its trigger and the content its panel; the vendor's context and
 * controllable-state hook were there to bridge two separate Radix roots.
 */
export type ChainOfThoughtProps = ComponentProps<typeof Collapsible>;

export const ChainOfThought = ({
  className,
  ...props
}: ChainOfThoughtProps) => (
  <Collapsible className={cn("not-prose w-full", className)} {...props} />
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  icon?: ReactNode;
  /** Trailing detail such as a duration or a step count. */
  meta?: ReactNode;
};

export const ChainOfThoughtHeader = ({
  children,
  className,
  icon,
  meta,
  ...props
}: ChainOfThoughtHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-md py-1 text-sm transition-colors duration-150 ease-out outline-none focus-visible:ring-[3px]",
      className
    )}
    {...props}
  >
    {icon}
    <span className="min-w-0 flex-1 text-left">{children}</span>
    {meta && (
      <span className="hidden shrink-0 font-mono text-xs tabular-nums sm:inline">
        {meta}
      </span>
    )}
  </CollapsibleTrigger>
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsiblePanel
>;

export const ChainOfThoughtContent = ({
  className,
  ...props
}: ChainOfThoughtContentProps) => (
  <CollapsiblePanel
    className={cn("text-popover-foreground outline-none", className)}
    {...props}
  />
);

export type ChainOfThoughtStepStatus = "complete" | "active" | "pending";

export type ChainOfThoughtStepProps = ComponentProps<"li"> & {
  icon?: ReactNode;
  /** Omitted when the children draw the row themselves. */
  label?: ReactNode;
  description?: ReactNode;
  /** Trailing detail such as a duration. */
  meta?: ReactNode;
  status?: ChainOfThoughtStepStatus;
  /** The last step draws no connector below its icon. */
  last?: boolean;
};

const stepStatusStyles: Record<ChainOfThoughtStepStatus, string> = {
  active: "text-foreground",
  complete: "text-muted-foreground",
  pending: "text-muted-foreground/60",
};

export const ChainOfThoughtStep = ({
  children,
  className,
  description,
  icon,
  label,
  last = false,
  meta,
  status = "complete",
  ...props
}: ChainOfThoughtStepProps) => (
  <li
    aria-current={status === "active" ? "step" : undefined}
    className={cn(
      "relative flex gap-3 text-sm transition-colors duration-150 ease-out",
      stepStatusStyles[status],
      className
    )}
    data-status={status}
    {...props}
  >
    <div className="relative flex w-4 shrink-0 justify-center">
      <span
        className={cn(
          "bg-background z-10 mt-0.5 flex size-4 items-center justify-center rounded-full",
          status === "active" && "text-primary"
        )}
      >
        {icon ?? <RiGitCommitLine className="size-4" />}
      </span>
      {!last && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-5 bottom-0 w-px",
            status === "pending" ? "bg-border/50" : "bg-border"
          )}
        />
      )}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1 pb-3">
      {label !== undefined && (
        <div className="flex items-baseline justify-between gap-2">
          <div
            className={cn(
              "min-w-0",
              status === "active" && "font-medium",
              status === "pending" && "italic"
            )}
          >
            {label}
          </div>
          {meta && (
            <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
              {meta}
            </span>
          )}
        </div>
      )}
      {description && (
        <div className="text-muted-foreground text-xs">{description}</div>
      )}
      {children}
    </div>
  </li>
);

export type ChainOfThoughtStepsProps = ComponentProps<"ol">;

export const ChainOfThoughtSteps = ({
  className,
  ...props
}: ChainOfThoughtStepsProps) => (
  <ol className={cn("mt-3 flex flex-col", className)} {...props} />
);
