"use client";

import { cn } from "@freenary/ui/lib/utils";
import type { ComponentProps } from "react";

// From the AI Elements registry, minus its highlighter and its copy button:
// the app shows short JSON here, and shiki would add a wasm bundle to colour
// two token kinds.

export type CodeBlockProps = ComponentProps<"div"> & {
  code: string;
  /** How many lines show before the block scrolls. */
  maxLines?: number;
};

const LINE_HEIGHT_REM = 1.25;

export const CodeBlock = ({
  children,
  className,
  code,
  maxLines = 12,
  ...props
}: CodeBlockProps) => (
  <div
    className={cn(
      "bg-muted/50 group relative w-full overflow-hidden rounded-md border",
      className
    )}
    {...props}
  >
    <pre
      className="overflow-auto p-3 font-mono text-xs leading-5 wrap-break-word whitespace-pre-wrap"
      style={{ maxHeight: `${maxLines * LINE_HEIGHT_REM}rem` }}
      tabIndex={0}
    >
      <code>{code}</code>
    </pre>
    {children}
  </div>
);
