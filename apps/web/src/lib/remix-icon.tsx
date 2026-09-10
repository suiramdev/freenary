import type {
  IconComponent,
  IconComponentProps,
} from "@freenary/ui/lib/icon-context";
import type { RemixiconComponentType } from "@remixicon/react";

/**
 * Adapts a Remix icon to a Fluid Functionalism icon slot (which passes a
 * numeric `size`, a `strokeWidth`, and a `className` — all valid SVG props).
 * Cached per icon so slots keep a stable component identity across renders.
 */
const cache = new Map<RemixiconComponentType, IconComponent>();

export const remixIcon = (Icon: RemixiconComponentType): IconComponent => {
  let adapted = cache.get(Icon);
  if (!adapted) {
    adapted = ({ className, size, strokeWidth }: IconComponentProps) => (
      <Icon className={className} size={size} strokeWidth={strokeWidth} />
    );
    cache.set(Icon, adapted);
  }
  return adapted;
};
