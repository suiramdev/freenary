import type {
  IconComponent,
  IconComponentProps,
} from "@freenary/ui/lib/icon-context";
import type { KubaiIconComponent } from "kubai-icons-react";

import type { ChartColorVar } from "./chart-colors";

const cache = new Map<KubaiIconComponent, Map<ChartColorVar, IconComponent>>();

export const kubaiIcon = (
  Icon: KubaiIconComponent,
  color: ChartColorVar
): IconComponent => {
  const byColor = cache.get(Icon) ?? new Map<ChartColorVar, IconComponent>();
  let adapted = byColor.get(color);

  if (!adapted) {
    adapted = ({ className, size }: IconComponentProps) => (
      <Icon className={className} color={color} size={size} />
    );

    byColor.set(color, adapted);
    cache.set(Icon, byColor);
  }

  return adapted;
};
