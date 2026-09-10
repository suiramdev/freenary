import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import { RiRepeatLine } from "@remixicon/react";

import {
  confidenceLabel,
  frequencyLabel,
} from "@/lib/budget/recurrence-labels";
import {
  RECURRENCE_CONFIDENCES,
  RECURRENCE_FREQUENCIES,
} from "@/lib/budget/recurring";
import type {
  RecurrenceConfidence,
  RecurrenceFrequency,
} from "@/lib/budget/recurring";
import {
  toggleConfidence,
  toggleFrequency,
} from "@/lib/budget/recurring-filters";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";

interface RecurrenceFilterMenuProps {
  confidences: RecurrenceConfidence[];
  frequencies: RecurrenceFrequency[];
  onConfidencesChange: (confidences: RecurrenceConfidence[]) => void;
  onFrequenciesChange: (frequencies: RecurrenceFrequency[]) => void;
}

// Fluid Functionalism menu rows register by flat index across the popup.
const CONFIDENCE_START = RECURRENCE_FREQUENCIES.length;

/**
 * The two properties of a recurrence itself: how often it lands, and how sure
 * the detection is. One menu rather than two triggers — both answer "which
 * repeats am I looking at", and the filter row has a company and a category
 * filter to fit beside them.
 */
export const RecurrenceFilterMenu = ({
  confidences,
  frequencies,
  onConfidencesChange,
  onFrequenciesChange,
}: RecurrenceFilterMenuProps) => {
  const activeCount = frequencies.length + confidences.length;

  const checkedIndices = [
    ...RECURRENCE_FREQUENCIES.flatMap((frequency, index) =>
      frequencies.includes(frequency) ? [index] : []
    ),
    ...RECURRENCE_CONFIDENCES.flatMap((confidence, index) =>
      confidences.includes(confidence) ? [CONFIDENCE_START + index] : []
    ),
  ];

  return (
    <DropdownMenu>
      <DropdownTrigger
        render={
          <Button leadingIcon={remixIcon(RiRepeatLine)} variant="tertiary" />
        }
      >
        {m.budget_filter_recurrence()}
        {activeCount > 0 && <Badge>{activeCount}</Badge>}
      </DropdownTrigger>
      <DropdownContent
        align="end"
        checkedIndices={checkedIndices}
        className="min-w-56"
      >
        <DropdownLabel>{m.budget_recurring_column_frequency()}</DropdownLabel>
        {RECURRENCE_FREQUENCIES.map((frequency, index) => (
          <MenuItem
            checked={frequencies.includes(frequency)}
            index={index}
            key={frequency}
            label={frequencyLabel(frequency)}
            onSelect={() =>
              onFrequenciesChange(toggleFrequency(frequencies, frequency))
            }
          />
        ))}
        <DropdownSeparator />
        <DropdownLabel>{m.budget_recurring_column_confidence()}</DropdownLabel>
        {RECURRENCE_CONFIDENCES.map((confidence, index) => (
          <MenuItem
            checked={confidences.includes(confidence)}
            index={CONFIDENCE_START + index}
            key={confidence}
            label={confidenceLabel(confidence)}
            onSelect={() =>
              onConfidencesChange(toggleConfidence(confidences, confidence))
            }
          />
        ))}
      </DropdownContent>
    </DropdownMenu>
  );
};
