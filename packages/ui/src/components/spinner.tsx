import { useUiLabels } from "@freenary/ui/lib/labels";
import { cn } from "@freenary/ui/lib/utils";
import { RiLoaderLine } from "@remixicon/react";

function Spinner({
  className,
  size,
  ...props
}: React.ComponentProps<typeof RiLoaderLine>) {
  const labels = useUiLabels();

  return (
    <RiLoaderLine
      data-slot="spinner"
      role="status"
      aria-label={labels.loading}
      size={size}
      // The 16px default applies only when no size was asked for: an icon slot
      // passes the ladder's own size, and a class here would outrank it.
      className={cn(size === undefined && "size-4", "animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
