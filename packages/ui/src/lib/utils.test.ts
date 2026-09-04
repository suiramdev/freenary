import { describe, expect, it } from "bun:test";

import { cn } from "./utils";

// Verbatim class strings from every `cn()` call site in the repo that merges
// something away, paired with the output clsx + tailwind-merge 3.6.0 produced
// before `cn` replaced them. A `cn` release that restyles one of these fails
// here; CI has no test job, so this is the local gate.
const MERGED_CALL_SITES: { args: string[]; expected: string; where: string }[] =
  [
    {
      args: [
        "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
        "items-center",
      ],
      expected:
        "[&>svg]:text-muted-foreground flex w-full flex-wrap gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 items-center",
      where: "packages/ui/src/components/chart.tsx",
    },
    {
      args: [
        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
        "h-2.5 w-2.5",
        "w-1",
        "w-0 border-[1.5px] border-dashed bg-transparent",
        "my-0.5",
      ],
      expected:
        "shrink-0 rounded-[2px] border-(--color-border) h-2.5 w-0 border-[1.5px] border-dashed bg-transparent my-0.5",
      where: "packages/ui/src/components/chart.tsx",
    },
    {
      args: [
        "flex flex-1 justify-between leading-none",
        "items-end",
        "items-center",
      ],
      expected: "flex flex-1 justify-between leading-none items-center",
      where: "packages/ui/src/components/chart.tsx",
    },
    {
      args: [
        "font-medium select-none",
        "text-sm",
        "[&>svg]:text-muted-foreground flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5",
      ],
      expected:
        "font-medium select-none [&>svg]:text-muted-foreground flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5",
      where: "packages/ui/src/components/calendar.tsx",
    },
    {
      args: [
        "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
        "group-data-[collapsible=offcanvas]:w-0",
        "group-data-[side=right]:rotate-180",
        "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]",
        "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
      ],
      expected:
        "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180 group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
      where: "packages/ui/src/components/sidebar.tsx",
    },
    {
      args: [
        "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
        "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
        "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
      ],
      expected:
        "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex p-2 group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
      where: "packages/ui/src/components/sidebar.tsx",
    },
    {
      args: [
        "flex size-7 shrink-0 items-center justify-center text-xs font-medium ring-1 transition-colors",
        "bg-primary text-primary-foreground ring-primary",
        "bg-secondary text-primary ring-primary",
        "bg-background text-muted-foreground ring-border",
      ],
      expected:
        "flex size-7 shrink-0 items-center justify-center text-xs font-medium ring-1 transition-colors bg-background text-muted-foreground ring-border",
      where: "apps/web/src/components/onboarding/onboarding-stepper.tsx",
    },
    {
      args: [
        "text-xs font-medium transition-colors",
        "text-foreground",
        "text-muted-foreground",
      ],
      expected: "text-xs font-medium transition-colors text-muted-foreground",
      where: "apps/web/src/components/onboarding/onboarding-stepper.tsx",
    },
    {
      args: [
        "bg-primary block h-px w-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        "scale-x-100",
        "scale-x-0",
      ],
      expected:
        "bg-primary block h-px w-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none scale-x-0",
      where: "apps/web/src/components/onboarding/onboarding-stepper.tsx",
    },
    {
      args: [
        "hover:bg-muted/60 flex w-full cursor-pointer flex-col gap-1.5 rounded-md p-1 text-start transition-transform duration-150 ease-out active:scale-[0.96]",
        "text-foreground",
        "text-muted-foreground",
      ],
      expected:
        "hover:bg-muted/60 flex w-full cursor-pointer flex-col gap-1.5 rounded-md p-1 text-start transition-transform duration-150 ease-out active:scale-[0.96] text-muted-foreground",
      where: "apps/web/src/components/budget/budget-vs-actual-chart.tsx",
    },
    {
      args: [
        "shrink-0 text-[10px]",
        "text-destructive",
        "text-muted-foreground",
      ],
      expected: "shrink-0 text-[10px] text-muted-foreground",
      where: "apps/web/src/components/budget/budget-vs-actual-chart.tsx",
    },
    {
      args: ["font-medium tabular-nums", "text-success", "text-destructive"],
      expected: "font-medium tabular-nums text-destructive",
      where: "apps/web/src/components/budget/transaction-row.tsx",
    },
    {
      args: [
        "flex items-center gap-1.5 font-mono text-[11px] transition-transform duration-150 ease-out active:scale-[0.96]",
        "hover:text-foreground cursor-pointer",
        "text-foreground",
        "text-muted-foreground",
      ],
      expected:
        "flex items-center gap-1.5 font-mono text-[11px] transition-transform duration-150 ease-out active:scale-[0.96] hover:text-foreground cursor-pointer text-muted-foreground",
      where: "apps/web/src/components/budget/spending-breakdown-chart.tsx",
    },
    {
      args: [
        "text-2xl font-semibold tabular-nums",
        "text-success",
        "text-foreground",
      ],
      expected: "text-2xl font-semibold tabular-nums text-foreground",
      where: "apps/web/src/components/budget/transaction-detail-drawer.tsx",
    },
    {
      args: [
        "text-fd-muted-foreground mb-1 text-sm font-medium",
        "text-fd-primary",
      ],
      expected: "mb-1 text-sm font-medium text-fd-primary",
      where: "apps/fumadocs/src/components/ai/search.tsx",
    },
    {
      args: [
        "bg-fd-card text-fd-card-foreground z-30 overflow-hidden [--ai-chat-width:400px] 2xl:[--ai-chat-width:460px]",
        "max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:rounded-2xl max-lg:border max-lg:shadow-xl",
        "lg:sticky lg:top-0 lg:ms-auto lg:h-dvh lg:border-s lg:in-[#nd-docs-layout]:[grid-area:toc] lg:in-[#nd-notebook-layout]:col-start-5 lg:in-[#nd-notebook-layout]:row-span-full",
        "animate-fd-dialog-in lg:animate-[ask-ai-open_200ms]",
        "animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]",
      ],
      expected:
        "bg-fd-card text-fd-card-foreground z-30 overflow-hidden [--ai-chat-width:400px] 2xl:[--ai-chat-width:460px] max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:rounded-2xl max-lg:border max-lg:shadow-xl lg:sticky lg:top-0 lg:ms-auto lg:h-dvh lg:border-s lg:in-[#nd-docs-layout]:[grid-area:toc] lg:in-[#nd-notebook-layout]:col-start-5 lg:in-[#nd-notebook-layout]:row-span-full animate-fd-dialog-in animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]",
      where: "apps/fumadocs/src/components/ai/search.tsx",
    },
  ];

describe("cn", () => {
  it("merges every real call site exactly as clsx + tailwind-merge did", () => {
    const actual = MERGED_CALL_SITES.map((site) => ({
      out: cn(site.args),
      where: site.where,
    }));

    expect(actual).toEqual(
      MERGED_CALL_SITES.map((site) => ({
        out: site.expected,
        where: site.where,
      }))
    );
  });

  it("lets a trailing className win over a variant class", () => {
    // Every component forwards `className` last so callers can override the
    // cva variant. That contract is the reason `cn` exists rather than a join.
    expect(cn("bg-primary text-primary-foreground", "bg-background")).toBe(
      "text-primary-foreground bg-background"
    );
    expect(
      cn("rounded-md", undefined, null, "", "rounded-(--cell-radius)")
    ).toBe("rounded-(--cell-radius)");
  });

  it("keeps classes whose conflict is scoped by a different variant", () => {
    expect(cn("flex items-stretch", "md:flex", "items-center")).toBe(
      "flex md:flex items-center"
    );
    expect(
      cn("bg-muted", "hover:bg-muted/60", "data-[state=open]:bg-accent")
    ).toBe("bg-muted hover:bg-muted/60 data-[state=open]:bg-accent");
  });

  it("resolves the Tailwind v4 forms the components rely on", () => {
    // `w-(--sidebar-width)` shorthand and `w-[calc(...)]` are the same group,
    // so the sidebar's collapsed width has to beat its expanded one.
    expect(
      cn("w-(--sidebar-width)", "w-[calc(var(--sidebar-width-icon)+1px)]")
    ).toBe("w-[calc(var(--sidebar-width-icon)+1px)]");
    // An important class outranks a later plain one regardless of order, so
    // both survive the merge.
    expect(cn("border-ring!", "border-destructive")).toBe(
      "border-ring! border-destructive"
    );
  });

  it("flattens the clsx argument forms the call sites pass", () => {
    expect(
      cn("text-sm", [
        "text-base",
        false && "text-lg",
        { "text-2xl": false, "text-xs": true },
      ])
    ).toBe("text-xs");
    expect(cn("p-2", "px-4")).toBe("p-2 px-4");
  });
});
