"use client";

import { Button } from "@freenary/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@freenary/ui/components/tooltip";
import { cn } from "@freenary/ui/lib/utils";
import type { ComponentProps, HTMLAttributes } from "react";

export type ArtifactProps = HTMLAttributes<HTMLDivElement>;

export const Artifact = ({ className, ...props }: ArtifactProps) => (
  <div
    className={cn(
      "bg-card text-card-foreground flex w-full shrink-0 flex-col overflow-hidden rounded-xl border shadow-xs",
      className
    )}
    {...props}
  />
);

export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactHeader = ({
  className,
  ...props
}: ArtifactHeaderProps) => (
  <div
    className={cn(
      "bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5",
      className
    )}
    {...props}
  />
);

export type ArtifactTitleProps = HTMLAttributes<HTMLParagraphElement>;

export const ArtifactTitle = ({ className, ...props }: ArtifactTitleProps) => (
  <p
    className={cn(
      "text-muted-foreground flex items-center gap-1.5 truncate text-xs font-medium",
      className
    )}
    {...props}
  />
);

export type ArtifactActionsProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactActions = ({
  className,
  ...props
}: ArtifactActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label: string;
};

export const ArtifactAction = ({
  children,
  label,
  size = "icon-sm",
  tooltip,
  variant = "ghost",
  ...props
}: ArtifactActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          {/* Base UI's TooltipTrigger renders its own button; `render` replaces
              it, where the vendor's Radix `asChild` nested one inside another. */}
          <TooltipTrigger render={button} />
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export type ArtifactContentProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactContent = ({
  className,
  ...props
}: ArtifactContentProps) => <div className={cn("p-4", className)} {...props} />;
