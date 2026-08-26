"use client";

import {
  CheckCircle,
  CircleNotch,
  Info,
  Warning,
  WarningOctagon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        error: <WarningOctagon className="size-4" />,
        info: <Info className="size-4" />,
        loading: <CircleNotch className="size-4 animate-spin" />,
        success: <CheckCircle className="size-4" />,
        warning: <Warning className="size-4" />,
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
