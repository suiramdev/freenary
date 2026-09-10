import type { CategoryAppearance } from "@freenary/api/lib/categories";
import type { IconComponent } from "@freenary/ui/lib/icon-context";
import { cn } from "@freenary/ui/lib/utils";

import { CategoryIcon } from "@/components/budget/category-icon";

/**
 * Adapts the colored category chip to a Fluid Functionalism menu icon slot.
 * Cached by appearance so rows keep a stable component identity across
 * renders — a fresh closure each render would remount the icon.
 */
const cache = new Map<string, IconComponent>();

export const categoryMenuIcon = (
  appearance: CategoryAppearance
): IconComponent => {
  const key = `${appearance.color}/${appearance.icon}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = ({ className }: { className?: string }) => (
      <CategoryIcon
        {...appearance}
        className={cn("size-5 [&_svg]:size-3", className)}
      />
    );
    cache.set(key, icon);
  }
  return icon;
};
