import { candidateNumber, NO_DUPLICATE } from "./questions";
import type { SubjectKind } from "./questions";
import {
  checklistGaps,
  decideReadiness,
  MIN_CRITERION_PROBABILITY,
  sectionGapText,
  STILL_TO_DEFINE,
  unmetCriteria,
} from "./readiness";
import type { Checklist, Gap, ReadinessStatus } from "./readiness";
import type { Answers } from "./subq";
import {
  CONTRIBUTOR_LABELS,
  GROUP_PREFIXES,
  IMPACT_LEVELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
} from "./taxonomy";
import type { ImpactLabel, PriorityLabel } from "./taxonomy";

export const MIN_SIGNAL_PROBABILITY = 0.8;
export const MIN_IMPACT_CONFIDENCE = 0.8;
export const MIN_GOOD_FIRST_ISSUE_PROBABILITY = 0.95;
export const MIN_DUPLICATE_CONFIDENCE = 0.85;

export interface PlanInput {
  readonly kind: SubjectKind;
  readonly answers: Answers;
  readonly checklist: Checklist | undefined;
  readonly ruleGaps: readonly Gap[];
  readonly refusedLabels: readonly string[];
  readonly docsExpected: boolean;
  readonly existingLabels: readonly string[];
  readonly workflowPriorities: readonly string[];
  readonly stillToDefine: readonly string[];
}

export interface Plan {
  readonly labels: string[];
  readonly removed: string[];
  readonly duplicateOf: number | undefined;
  readonly gaps: Gap[];
  readonly readiness: ReadinessStatus;
  readonly comment: boolean;
  readonly notes: string[];
}

export const LABEL_BY_QUESTION = {
  good_first_issue: CONTRIBUTOR_LABELS.goodFirstIssue,
} as const satisfies Record<string, string>;

const PRIORITY_SIGNALS = ["regression", "security"] as const;

const MIN_PROBABILITY_BY_QUESTION: Readonly<Record<string, number>> = {
  good_first_issue: MIN_GOOD_FIRST_ISSUE_PROBABILITY,
};

const isKnownKey = <T extends object>(
  table: T,
  key: string
): key is Extract<keyof T, string> => Object.hasOwn(table, key);

type TypeKey = keyof typeof TYPE_LABELS;

export const TYPE_TIE_ORDER = [
  "bug",
  "documentation",
  "feature",
  "maintenance",
] as const satisfies readonly TypeKey[];

export const IMPACT_TIE_ORDER = IMPACT_LEVELS.toReversed();

const roundHalfUp: (score: number) => number = Math.round;

interface RankedOption<Option extends string> {
  readonly option: Option;
  readonly probability: number;
}

const rankOptions = <Option extends string>(
  probabilityOf: (option: Option) => number | undefined,
  tieOrder: readonly Option[]
): RankedOption<Option>[] =>
  tieOrder
    .flatMap((option) => {
      const probability = probabilityOf(option);

      return probability === undefined ? [] : [{ option, probability }];
    })
    .toSorted((left, right) => right.probability - left.probability);

const runnerUpText = <Option extends string>(
  ranked: readonly RankedOption<Option>[],
  top: Option
): string => {
  const runnerUp = ranked.find((entry) => entry.option !== top);

  return runnerUp
    ? `; next ${runnerUp.option} ${runnerUp.probability.toFixed(2)}`
    : "";
};

const topChoice = <Option extends string>(
  answers: Answers,
  key: string,
  tieOrder: readonly Option[],
  notes: string[]
): Option | undefined => {
  const answer = answers[key];

  if (answer?.type !== "choice") {
    notes.push(`${key}: no answer`);

    return undefined;
  }

  const ranked = rankOptions(
    (option) => answer.probabilities?.[option],
    tieOrder
  );

  const [leader] = ranked;
  const stated = tieOrder.find((option) => option === answer.choice);
  const statedTiesLeader =
    leader !== undefined &&
    stated !== undefined &&
    answer.probabilities?.[stated] === leader.probability;

  const top =
    stated === undefined || statedTiesLeader ? leader?.option : stated;

  if (top === undefined) {
    notes.push(`${key}: no answer`);

    return undefined;
  }

  const confidence =
    top === stated ? answer.confidence : (leader?.probability ?? 0);

  notes.push(
    `${key}: ${top} (${confidence.toFixed(2)}${runnerUpText(ranked, top)})`
  );

  return top;
};

const topImpact = (
  answers: Answers,
  notes: string[]
): ImpactLabel | undefined => {
  const answer = answers.impact;

  if (answer?.type !== "score") {
    notes.push("impact: no answer");

    return undefined;
  }

  const index = Math.min(
    Math.max(roundHalfUp(answer.score), 0),
    IMPACT_LEVELS.length - 1
  );

  const top = IMPACT_LEVELS[index] ?? IMPACT_LEVELS[0];
  const ranked = rankOptions(
    (level) => answer.probabilities?.[String(IMPACT_LEVELS.indexOf(level))],
    IMPACT_TIE_ORDER
  );

  const justified = answer.confidence >= MIN_IMPACT_CONFIDENCE;

  notes.push(
    `impact: ${top} (score ${answer.score.toFixed(2)}, ${answer.confidence.toFixed(2)}${runnerUpText(ranked, top)})${
      justified ? "" : `; below ${MIN_IMPACT_CONFIDENCE.toFixed(2)}, no label`
    }`
  );

  return justified ? top : undefined;
};

const isYes = (answers: Answers, key: string, notes: string[]): boolean => {
  const answer = answers[key];

  if (answer?.type !== "noul") {
    return false;
  }

  notes.push(`${key}: ${answer.noul.toFixed(2)}`);

  return (
    answer.noul >= (MIN_PROBABILITY_BY_QUESTION[key] ?? MIN_SIGNAL_PROBABILITY)
  );
};

const hasGroup = (labels: readonly string[], prefix: string): boolean =>
  labels.some((label) => label.startsWith(prefix));

const planType = (answers: Answers, notes: string[]): string | undefined => {
  const choice = topChoice(answers, "type", TYPE_TIE_ORDER, notes);

  return choice ? TYPE_LABELS[choice] : undefined;
};

export const resolveTypeLabel = (
  answers: Answers,
  existingLabels: readonly string[],
  refusedLabels: readonly string[]
): string | undefined => {
  const modelType = planType(answers, []);

  return (
    existingLabels.find((label) => label.startsWith(GROUP_PREFIXES.type)) ??
    (modelType && !refusedLabels.includes(modelType) ? modelType : undefined)
  );
};

const isMet = (answers: Answers, key: string): boolean => {
  const answer = answers[key];

  return answer?.type === "noul" && answer.noul >= MIN_CRITERION_PROBABILITY;
};

const pullRequestGaps = (input: PlanInput): Gap[] => {
  const gaps: Gap[] = [];

  const summaryFlagged = input.ruleGaps.some(
    (gap) => gap.text === sectionGapText("Summary")
  );

  if (!summaryFlagged && !isMet(input.answers, "pr_summary")) {
    gaps.push({
      owner: "author",
      text: "Write a Summary that says what changed and what to review first.",
    });
  }

  if (input.docsExpected && !isMet(input.answers, "pr_docs")) {
    gaps.push({
      owner: "author",
      text: "Name the documentation pages you updated, or say in the Notes why none needed a change.",
    });
  }

  return gaps;
};

const planDuplicate = (
  answers: Answers,
  notes: string[]
): number | undefined => {
  const answer = answers.duplicate;

  if (answer?.type !== "choice" || answer.choice === NO_DUPLICATE) {
    return undefined;
  }

  notes.push(`duplicate: ${answer.choice} (${answer.confidence.toFixed(2)})`);

  return answer.confidence >= MIN_DUPLICATE_CONFIDENCE
    ? candidateNumber(answer.choice)
    : undefined;
};

const PRIORITY_BY_IMPACT = {
  "impact: high": PRIORITY_LABELS.high,
  "impact: low": PRIORITY_LABELS.low,
  "impact: medium": PRIORITY_LABELS.medium,
} as const satisfies Record<ImpactLabel, PriorityLabel>;

const RAISED_PRIORITY = {
  [PRIORITY_LABELS.high]: PRIORITY_LABELS.high,
  [PRIORITY_LABELS.low]: PRIORITY_LABELS.medium,
  [PRIORITY_LABELS.medium]: PRIORITY_LABELS.high,
} as const satisfies Record<PriorityLabel, PriorityLabel>;

export type PrioritySignal = (typeof PRIORITY_SIGNALS)[number];

export const derivePriority = (
  impact: string | undefined,
  signals: readonly PrioritySignal[]
): PriorityLabel | undefined => {
  if (signals.includes("security")) {
    return PRIORITY_LABELS.high;
  }

  const fromImpact =
    impact && isKnownKey(PRIORITY_BY_IMPACT, impact)
      ? PRIORITY_BY_IMPACT[impact]
      : undefined;

  return fromImpact && signals.includes("regression")
    ? RAISED_PRIORITY[fromImpact]
    : fromImpact;
};

const planPrioritySignals = (
  answers: Answers,
  notes: string[]
): PrioritySignal[] =>
  PRIORITY_SIGNALS.filter((question) => isYes(answers, question, notes));

interface GapSources {
  readonly unmet: readonly string[];
  readonly duplicateOf: number | undefined;
}

const collectGaps = (input: PlanInput, sources: GapSources): Gap[] => [
  ...(input.checklist ? checklistGaps(input.checklist, sources.unmet) : []),
  ...(input.kind === "pull-request" ? pullRequestGaps(input) : []),
  ...input.ruleGaps,
  ...(input.stillToDefine.length > 0
    ? [
        {
          owner: "maintainer" as const,
          text: `Settle the ${input.stillToDefine.length} open item${
            input.stillToDefine.length === 1 ? "" : "s"
          } under ${STILL_TO_DEFINE}.`,
        },
      ]
    : []),
  ...(sources.duplicateOf === undefined
    ? []
    : [
        {
          owner: "maintainer" as const,
          text: `Check whether this duplicates #${sources.duplicateOf}.`,
        },
      ]),
];

const CONTRIBUTOR_LABEL_NAMES: readonly string[] =
  Object.values(CONTRIBUTOR_LABELS);

const priorityNote = (
  priority: string | undefined,
  impact: string | undefined,
  signals: readonly PrioritySignal[]
): string =>
  `priority: ${priority ?? "none"} (from ${impact ?? "no justified impact"}${
    signals.length > 0 ? ` and ${signals.join(", ")}` : ""
  })`;

const isGoodFirstIssue = (
  input: PlanInput,
  readiness: ReadinessStatus,
  notes: string[]
): boolean => {
  if (input.stillToDefine.length > 0) {
    notes.push(
      `${STILL_TO_DEFINE}: ${input.stillToDefine.length} open; no ${CONTRIBUTOR_LABEL_NAMES.join(" or ")}`
    );

    return false;
  }

  return (
    input.kind === "issue" &&
    isYes(input.answers, "good_first_issue", notes) &&
    readiness === "ready"
  );
};

const planRemovals = (
  input: PlanInput,
  priority: string | undefined,
  maintainerPriority: boolean
): string[] => [
  ...input.workflowPriorities.filter(
    (label) => maintainerPriority || label !== priority
  ),
  ...(input.stillToDefine.length > 0
    ? input.existingLabels.filter((label) =>
        CONTRIBUTOR_LABEL_NAMES.includes(label)
      )
    : []),
];

export const planLabels = (input: PlanInput): Plan => {
  const notes: string[] = [];
  const existing = input.existingLabels.filter(
    (label) => !input.workflowPriorities.includes(label)
  );

  const labels: string[] = [];
  const refused = new Set(input.refusedLabels);

  const allowed = (label: string | undefined): string | undefined =>
    label !== undefined && !refused.has(label) ? label : undefined;

  const type = allowed(planType(input.answers, notes));
  const impact = allowed(topImpact(input.answers, notes));

  const unmet = input.checklist
    ? unmetCriteria(input.checklist, input.answers)
    : [];

  notes.push(
    `checklist ${input.checklist ?? "none"}: ${unmet.join(", ") || "all met"}`
  );

  const settledImpact =
    existing.find((label) => label.startsWith(GROUP_PREFIXES.impact)) ?? impact;

  const signals = planPrioritySignals(input.answers, notes);
  const priority = derivePriority(settledImpact, signals);
  const maintainerPriority = hasGroup(existing, GROUP_PREFIXES.priority);

  notes.push(
    maintainerPriority
      ? "priority: kept the existing label"
      : priorityNote(priority, settledImpact, signals)
  );

  const grouped: readonly (readonly [string, readonly string[]])[] = [
    [GROUP_PREFIXES.type, type ? [type] : []],
    [GROUP_PREFIXES.priority, priority ? [priority] : []],
    [GROUP_PREFIXES.impact, impact ? [impact] : []],
  ];

  for (const [prefix, candidates] of grouped) {
    if (!hasGroup(existing, prefix)) {
      labels.push(...candidates);
    }
  }

  const duplicateOf = planDuplicate(input.answers, notes);
  const gaps = collectGaps(input, { duplicateOf, unmet });

  const blocked = isYes(input.answers, "blocked", notes);
  const readiness = decideReadiness(blocked, gaps);

  notes.push(`readiness: ${readiness}`);

  if (isGoodFirstIssue(input, readiness, notes)) {
    labels.push(LABEL_BY_QUESTION.good_first_issue);
  }

  const added = [...new Set(labels)].filter(
    (label) => !input.existingLabels.includes(label) && !refused.has(label)
  );

  return {
    comment: readiness !== "blocked" && !maintainerPriority,
    duplicateOf,
    gaps,
    labels: added,
    notes,
    readiness,
    removed: planRemovals(input, priority, maintainerPriority),
  };
};
