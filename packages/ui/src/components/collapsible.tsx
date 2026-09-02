import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "@freenary/ui/lib/utils";
import { RiArrowRightSLine } from "@remixicon/react";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  children,
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/collapsible-trigger flex w-full cursor-pointer items-center gap-2 text-left",
        className
      )}
      {...props}
    >
      <RiArrowRightSLine className="text-muted-foreground size-3 shrink-0 transition-transform duration-150 ease-out group-data-panel-open/collapsible-trigger:rotate-90" />
      {children}
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
