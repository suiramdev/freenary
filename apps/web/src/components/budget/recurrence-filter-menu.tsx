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

const CONFIDENCE_START = RECURRENCE_FREQUENCIES.length;

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
        {activeCount > 0 && <Badge className="ml-1.5">{activeCount}</Badge>}
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
