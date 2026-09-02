import { useUiLabels } from "@freenary/ui/lib/labels";
import { cn } from "@freenary/ui/lib/utils";
import { RiLoaderLine } from "@remixicon/react";

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof RiLoaderLine>) {
  const labels = useUiLabels();

  return (
    <RiLoaderLine
      data-slot="spinner"
      role="status"
      aria-label={labels.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
