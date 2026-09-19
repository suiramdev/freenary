import type { CategoryAppearance } from "@freenary/api/lib/categories";
import type { IconComponent } from "@freenary/ui/lib/icon-context";
import { cn } from "@freenary/ui/lib/utils";

import { CategoryIcon } from "./category-icon";

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
