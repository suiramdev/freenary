import { Badge } from "@freenary/ui/components/badge";

import {
  confidenceLabel,
  confidenceVariant,
} from "@/lib/budget/recurrence-labels";
import type { RecurrenceConfidence } from "@/lib/budget/recurring";

/**
 * How sure the detection is. One word and no tooltip: a tooltip on a badge that
 * repeats on every row opens on hover alone, and the line above the table
 * already says what the level means for the kind on show.
 */
export const ConfidenceBadge = ({
  className,
  confidence,
}: {
  className?: string;
  confidence: RecurrenceConfidence;
}) => (
  <Badge className={className} variant={confidenceVariant(confidence)}>
    {confidenceLabel(confidence)}
  </Badge>
);
