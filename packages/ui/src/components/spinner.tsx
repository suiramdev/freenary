import { useUiLabels } from "@freenary/ui/lib/labels";
import { cn } from "@freenary/ui/lib/utils";
import { SpinnerIcon } from "@phosphor-icons/react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const labels = useUiLabels();

  return (
    <SpinnerIcon
      data-slot="spinner"
      role="status"
      aria-label={labels.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
