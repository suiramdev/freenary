import { m } from "@/paraglide/messages.js";

import type {
  RecurrenceConfidence,
  RecurrenceFrequency,
  RecurrenceKind,
} from "./recurring";

const FREQUENCY_MESSAGES = {
  annual: m.budget_recurrence_frequency_annual,
  irregular: m.budget_recurrence_frequency_irregular,
  monthly: m.budget_recurrence_frequency_monthly,
  quarterly: m.budget_recurrence_frequency_quarterly,
  weekly: m.budget_recurrence_frequency_weekly,
} satisfies Record<RecurrenceFrequency, () => string>;

const CONFIDENCE_MESSAGES = {
  confirmed: m.budget_recurrence_confidence_confirmed,
  likely: m.budget_recurrence_confidence_likely,
  pattern: m.budget_recurrence_confidence_pattern,
} satisfies Record<RecurrenceConfidence, () => string>;

const SECTION_MESSAGES = {
  behavioral: m.budget_recurring_section_behavioral,
  fixed: m.budget_recurring_section_fixed,
} satisfies Record<RecurrenceKind, () => string>;

const SECTION_HINT_MESSAGES = {
  behavioral: m.budget_recurring_section_behavioral_hint,
  fixed: m.budget_recurring_section_fixed_hint,
} satisfies Record<RecurrenceKind, () => string>;

const SECTION_EMPTY_MESSAGES = {
  behavioral: m.budget_recurring_section_empty_behavioral,
  fixed: m.budget_recurring_section_empty_fixed,
} satisfies Record<RecurrenceKind, () => string>;

const CONFIDENCE_VARIANTS = {
  confirmed: { color: "green", variant: "solid" },
  likely: { color: "amber", variant: "solid" },
  pattern: { color: "gray", variant: "dot" },
} as const satisfies Record<
  RecurrenceConfidence,
  { color: "amber" | "gray" | "green"; variant: "dot" | "solid" }
>;

const TODAY = 0;
const TOMORROW = 1;

export const frequencyLabel = (frequency: RecurrenceFrequency): string =>
  FREQUENCY_MESSAGES[frequency]();

export const confidenceLabel = (confidence: RecurrenceConfidence): string =>
  CONFIDENCE_MESSAGES[confidence]();

export const confidenceVariant = (confidence: RecurrenceConfidence) =>
  CONFIDENCE_VARIANTS[confidence];

export const sectionLabel = (kind: RecurrenceKind): string =>
  SECTION_MESSAGES[kind]();

export const sectionHint = (kind: RecurrenceKind): string =>
  SECTION_HINT_MESSAGES[kind]();

export const sectionEmptyLabel = (kind: RecurrenceKind): string =>
  SECTION_EMPTY_MESSAGES[kind]();

export const relativeDayLabel = (daysAway: number): string => {
  if (daysAway === TODAY) {
    return m.budget_recurring_upcoming_today();
  }

  if (daysAway === TOMORROW) {
    return m.budget_recurring_upcoming_tomorrow();
  }

  return m.budget_recurring_upcoming_in_days({ count: daysAway });
};
