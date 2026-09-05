"use client";

import { Badge } from "@freenary/ui/components/badge";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ToolProps = ComponentProps<typeof Collapsible>;

/**
 * One lookup, as a row on the timeline rather than a card: the row's text
 * starts where every other row's does, and opening it adds sections below,
 * not a box around.
 */
export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn("not-prose w-full", className)} {...props} />
);

export interface ToolHeaderProps extends Omit<
  ComponentProps<typeof CollapsibleTrigger>,
  "title" | "chevron"
> {
  title: ReactNode;
  /** What the tool is for, in the reader's words; shown after the name. */
  description?: ReactNode;
  /** The status badge; the app owns its states and their wording. */
  badge?: ReactNode;
  /** Trailing detail such as a duration. */
  meta?: ReactNode;
}

export const ToolHeader = ({
  badge,
  className,
  description,
  meta,
  title,
  ...props
}: ToolHeaderProps) => (
  // The chevron trails so the name lines up with the other rows' labels. The
  // negative margin keeps that alignment under the hover surface.
  <CollapsibleTrigger
    chevron="trailing"
    className={cn(
      "hover:bg-muted/50 focus-visible:ring-ring/50 -ml-2 w-[calc(100%+0.5rem)] rounded-md px-2 py-1 transition-colors duration-150 ease-out outline-none focus-visible:ring-[3px]",
      className
    )}
    {...props}
  >
    <span className="flex min-w-0 flex-1 items-baseline gap-2">
      <span className="truncate text-sm">{title}</span>
      {description && (
        <span className="text-muted-foreground hidden truncate text-xs sm:inline">
          {description}
        </span>
      )}
    </span>
    {meta && (
      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {meta}
      </span>
    )}
    {badge}
  </CollapsibleTrigger>
);

export type ToolStatusBadgeProps = ComponentProps<typeof Badge> & {
  icon?: ReactNode;
};

export const ToolStatusBadge = ({
  children,
  className,
  icon,
  ...props
}: ToolStatusBadgeProps) => (
  <Badge
    className={cn("shrink-0 gap-1.5 rounded-full text-xs", className)}
    variant="secondary"
    {...props}
  >
    {icon}
    {children}
  </Badge>
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

export type ToolSectionProps = ComponentProps<"section"> & {
  heading: ReactNode;
  /** Controls beside the heading, such as a copy button. */
  actions?: ReactNode;
};

export const ToolSection = ({
  actions,
  children,
  className,
  heading,
  ...props
}: ToolSectionProps) => (
  <section className={cn("space-y-2 border-t py-3", className)} {...props}>
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {heading}
      </h4>
      {actions}
    </div>
    {children}
  </section>
);

export type ToolErrorProps = ComponentProps<"div">;

export const ToolError = ({ className, ...props }: ToolErrorProps) => (
  <div
    className={cn(
      "bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs",
      className
    )}
    role="alert"
    {...props}
  />
);
