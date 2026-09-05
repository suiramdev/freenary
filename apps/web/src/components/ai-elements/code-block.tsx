"use client";

import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import type { ComponentProps } from "react";
import { createContext, useContext, useEffect, useState } from "react";

// No highlighter: the app shows short JSON here, and shiki would add a wasm
// bundle to colour two token kinds.

interface CodeBlockContextValue {
  code: string;
}

const CodeBlockContext = createContext<CodeBlockContextValue>({ code: "" });

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
  <CodeBlockContext.Provider value={{ code }}>
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
  </CodeBlockContext.Provider>
);

const COPIED_MS = 2000;

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  label: string;
  copiedLabel: string;
  /** Overrides the enclosing block's code, for a button placed outside it. */
  code?: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
};

export const CodeBlockCopyButton = ({
  className,
  code: codeProp,
  copiedLabel,
  label,
  onCopy,
  onError,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const context = useContext(CodeBlockContext);
  const code = codeProp ?? context.code;

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timer = window.setTimeout(() => setIsCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <Button
      aria-label={isCopied ? copiedLabel : label}
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {/* Both icons stay mounted and cross-fade, so the swap can be interrupted. */}
      <span className="relative size-3.5">
        <RiFileCopyLine
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-3.5 transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
            isCopied ? "scale-25 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <RiCheckLine
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-3.5 text-green-600 transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
            isCopied ? "scale-100 opacity-100" : "scale-25 opacity-0"
          )}
        />
      </span>
    </Button>
  );
};
