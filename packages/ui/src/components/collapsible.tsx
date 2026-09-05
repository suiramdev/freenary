import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

type CollapsibleTriggerProps = CollapsiblePrimitive.Trigger.Props & {
  /** A trailing chevron keeps the row's text aligned with rows that have none. */
  chevron?: "leading" | "trailing";
};

function CollapsibleTrigger({
  chevron = "leading",
  children,
  className,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/collapsible-trigger flex w-full cursor-pointer items-center gap-2 text-left",
        className
      )}
      {...props}
    >
      {chevron === "leading" && (
        <RiArrowRightSLine className="text-muted-foreground size-3 shrink-0 transition-transform duration-150 ease-out group-data-panel-open/collapsible-trigger:rotate-90" />
      )}
      {children}
      {chevron === "trailing" && (
        <RiArrowDownSLine className="text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out group-data-panel-open/collapsible-trigger:rotate-180" />
      )}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsiblePanel({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cn(
        "flex h-[var(--collapsible-panel-height)] flex-col overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 [&[hidden]:not([hidden='until-found'])]:hidden",
        className
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsiblePanel };
