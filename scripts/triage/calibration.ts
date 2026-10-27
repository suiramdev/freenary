import { GOOD_FIRST_ISSUE_CHOICES } from "./questions";
import type { Answers } from "./subq";
import {
  GOOD_FIRST_ISSUE_LABEL,
  GROUP_PREFIXES,
  IMPACT_LABELS,
  TYPE_LABELS,
} from "./taxonomy";

export type Sample =
  | {
      readonly kind: "label";
      readonly question: string;
      readonly confidence: number;
      readonly matches: boolean;
    }
  | {
      readonly kind: "signal";
      readonly question: string;
      readonly probability: number;
      readonly present: boolean;
    };

export interface ThresholdRow {
  readonly question: string;
  readonly threshold: number;
  readonly covered: number;
  readonly agreement: number | undefined;
}

export const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95] as const;

export interface ReviewedItem {
  readonly labels: readonly string[];
}

const SIGNAL_BY_QUESTION = {
  good_first_issue: {
    choice: GOOD_FIRST_ISSUE_CHOICES.yes,
    label: GOOD_FIRST_ISSUE_LABEL,
  },
} as const satisfies Record<string, { choice: string; label: string }>;

const groupLabel = (
  labels: readonly string[],
  prefix: string
): string | undefined => labels.find((label) => label.startsWith(prefix));

const labelSample = (
  answers: Answers,
  labels: readonly string[],
  question: string,
  labelByChoice: Readonly<Record<string, string>>,
  prefix: string
): Sample[] => {
  const answer = answers[question];

  if (answer?.type !== "choice" || !groupLabel(labels, prefix)) {
    return [];
  }

  const predicted: string | undefined = Object.entries(labelByChoice).find(
    ([key]) => key === answer.choice
  )?.[1];

  return [
    {
      confidence: answer.confidence,
      kind: "label",
      matches: predicted !== undefined && labels.includes(predicted),
      question,
    },
  ];
};

const choiceProbability = (
  answer: Answers[string],
  choice: string
): number | undefined => {
  if (answer?.type !== "choice") {
    return undefined;
  }

  const stated = answer.choice === choice ? answer.confidence : undefined;

  return answer.probabilities?.[choice] ?? stated ?? 1 - answer.confidence;
};

const signalSamples = (answers: Answers, item: ReviewedItem): Sample[] =>
  Object.entries(SIGNAL_BY_QUESTION).flatMap(([question, signal]) => {
    const probability = choiceProbability(answers[question], signal.choice);

    return probability === undefined
      ? []
      : [
          {
            kind: "signal" as const,
            present: item.labels.includes(signal.label),
            probability,
            question,
          },
        ];
  });

export const samplesFor = (answers: Answers, item: ReviewedItem): Sample[] => [
  ...labelSample(
    answers,
    item.labels,
    "type",
    TYPE_LABELS,
    GROUP_PREFIXES.type
  ),
  ...labelSample(
    answers,
    item.labels,
    "impact",
    IMPACT_LABELS,
    GROUP_PREFIXES.impact
  ),
  ...signalSamples(answers, item),
];

const rowFor = (
  question: string,
  threshold: number,
  ofQuestion: readonly Sample[]
): ThresholdRow => {
  const outcomes = ofQuestion.flatMap((sample) => {
    if (sample.kind === "signal") {
      return [sample.probability >= threshold === sample.present];
    }

    return sample.confidence >= threshold ? [sample.matches] : [];
  });

  const agreeing = outcomes.filter(Boolean).length;

  return {
    agreement: outcomes.length > 0 ? agreeing / outcomes.length : undefined,
    covered: outcomes.length,
    question,
    threshold,
  };
};

export const measureAgreement = (
  samples: readonly Sample[]
): ThresholdRow[] => {
  const questions = [...new Set(samples.map((sample) => sample.question))];

  return questions.toSorted().flatMap((question) => {
    const ofQuestion = samples.filter((sample) => sample.question === question);

    return THRESHOLDS.map((threshold) =>
      rowFor(question, threshold, ofQuestion)
    );
  });
};

export const renderTable = (rows: readonly ThresholdRow[]): string =>
  [
    "| Question | Threshold | Items | Agreement |",
    "| --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.question} | ${row.threshold.toFixed(2)} | ${row.covered} | ${
          row.agreement === undefined ? "–" : row.agreement.toFixed(2)
        } |`
    ),
  ].join("\n");

export interface RecordedRun {
  readonly answers: Answers;
  readonly existingLabels: readonly string[];
  readonly recordedAt: string;
}

const PREFIX_BY_QUESTION: Readonly<Record<string, string>> = {
  impact: GROUP_PREFIXES.impact,
  type: GROUP_PREFIXES.type,
};

const inputCarriedAnswer = (
  existingLabels: readonly string[],
  question: string
): boolean => {
  const prefix = PREFIX_BY_QUESTION[question];

  if (prefix !== undefined) {
    return existingLabels.some((label) => label.startsWith(prefix));
  }

  return Object.entries(SIGNAL_BY_QUESTION).some(
    ([signalQuestion, signal]) =>
      signalQuestion === question && existingLabels.includes(signal.label)
  );
};

export const blindSamples = (
  runs: readonly RecordedRun[],
  item: ReviewedItem
): Sample[] => {
  const byQuestion = new Map<string, Sample>();
  const newestFirst = runs.toSorted((left, right) =>
    right.recordedAt.localeCompare(left.recordedAt)
  );

  for (const run of newestFirst) {
    for (const sample of samplesFor(run.answers, item)) {
      if (
        !byQuestion.has(sample.question) &&
        !inputCarriedAnswer(run.existingLabels, sample.question)
      ) {
        byQuestion.set(sample.question, sample);
      }
    }
  }

  return [...byQuestion.values()];
};
