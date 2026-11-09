import type {
  IconComponent,
  IconComponentProps,
} from "@freenary/ui/lib/icon-context";
import type { KubaiIconComponent } from "kubai-icons-react";

const CURRENT_COLOR = "currentColor";

const cache = new Map<KubaiIconComponent, Map<string, IconComponent>>();

export const kubaiIcon = (
  Icon: KubaiIconComponent,
  color: string = CURRENT_COLOR
): IconComponent => {
  const byColor = cache.get(Icon) ?? new Map<string, IconComponent>();
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
