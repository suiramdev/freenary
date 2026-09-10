import { Badge } from "@freenary/ui/components/badge";

import {
  confidenceLabel,
  confidenceVariant,
} from "@/lib/budget/recurrence-labels";
import type { RecurrenceConfidence } from "@/lib/budget/recurring";

export const ConfidenceBadge = ({
  className,
  confidence,
}: {
  className?: string;
  confidence: RecurrenceConfidence;
}) => (
  <Badge className={className} {...confidenceVariant(confidence)}>
    {confidenceLabel(confidence)}
  </Badge>
);
