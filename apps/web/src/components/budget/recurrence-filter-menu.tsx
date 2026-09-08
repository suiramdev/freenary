import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
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
import { m } from "@/paraglide/messages.js";

interface RecurrenceFilterMenuProps {
  confidences: RecurrenceConfidence[];
  frequencies: RecurrenceFrequency[];
  onConfidencesChange: (confidences: RecurrenceConfidence[]) => void;
  onFrequenciesChange: (frequencies: RecurrenceFrequency[]) => void;
}

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <RiRepeatLine data-icon="inline-start" />
        {m.budget_filter_recurrence()}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {m.budget_recurring_column_frequency()}
          </DropdownMenuLabel>
          {RECURRENCE_FREQUENCIES.map((frequency) => (
            <DropdownMenuCheckboxItem
              checked={frequencies.includes(frequency)}
              key={frequency}
              onCheckedChange={() =>
                onFrequenciesChange(toggleFrequency(frequencies, frequency))
              }
            >
              {frequencyLabel(frequency)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {m.budget_recurring_column_confidence()}
          </DropdownMenuLabel>
          {RECURRENCE_CONFIDENCES.map((confidence) => (
            <DropdownMenuCheckboxItem
              checked={confidences.includes(confidence)}
              key={confidence}
              onCheckedChange={() =>
                onConfidencesChange(toggleConfidence(confidences, confidence))
              }
            >
              {confidenceLabel(confidence)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
