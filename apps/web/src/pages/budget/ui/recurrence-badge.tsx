import { Badge } from "@freenary/ui/components/badge";

import { confidenceLabel, confidenceVariant } from "../model/recurrence-labels";
import type { RecurrenceConfidence } from "../model/recurring";

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
