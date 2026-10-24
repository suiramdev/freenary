import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { Effect } from "effect";

import { renderGapComment } from "./comment";
import {
  derivePriority,
  IMPACT_TIE_ORDER,
  MIN_GOOD_FIRST_ISSUE_PROBABILITY,
  MIN_IMPACT_CONFIDENCE,
  MIN_SIGNAL_PROBABILITY,
  planLabels,
  TYPE_TIE_ORDER,
} from "./plan";
import type { PlanInput } from "./plan";
import { buildQuestions } from "./questions";
import { decide, SubqRequestFailed } from "./subq";
import type { Answers } from "./subq";
import { LABELS } from "./taxonomy";

const confidentBug: Answers = {
  blocked: { noul: 0.05, type: "noul" },
  check_environment: { noul: 0.9, type: "noul" },
  check_expected_actual: { noul: 0.9, type: "noul" },
  check_steps: { noul: 0.9, type: "noul" },
  impact: { confidence: 0.8, score: 1.2, type: "score" },
  regression: { noul: 0.95, type: "noul" },
  security: { noul: 0.2, type: "noul" },
  type: { choice: "bug", confidence: 0.95, type: "choice" },
};

const planFor = (overrides: Partial<PlanInput>) =>
  planLabels({
    answers: confidentBug,
    checklist: "bug",
    docsExpected: false,
    existingLabels: [],
    kind: "issue",
    refusedLabels: [],
    ruleGaps: [],
    stillToDefine: [],
    workflowPriorities: [],
    ...overrides,
  });

describe("planLabels", () => {
  it("labels every group of a confident answer set", () => {
    const plan = planFor({});

    expect(plan.labels.toSorted()).toEqual(
      ["impact: medium", "priority: high", "type: bug"].toSorted()
    );

    expect(plan.readiness).toBe("ready");
    expect(plan.comment).toBe(true);
  });

  it("applies a narrow top type and notes its runner-up", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: {
          choice: "feature",
          confidence: 0.49,
          probabilities: { bug: 0.05, feature: 0.49, maintenance: 0.46 },
          type: "choice",
        },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: feature");
    expect(plan.notes).toContain("type: feature (0.49; next maintenance 0.46)");
  });

  it("never overrides a group a maintainer already labelled", () => {
    const plan = planFor({ existingLabels: ["type: feature"] });

    expect(plan.labels).not.toContain("type: bug");
  });

  it("asks a maintainer about a confident duplicate without a label", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        duplicate: { choice: "item-14", confidence: 0.9, type: "choice" },
      },
    });

    expect(plan.duplicateOf).toBe(14);
    expect(plan.labels).not.toContain("duplicate");
    expect(plan.gaps).toContainEqual({
      owner: "maintainer",
      text: "Check whether this duplicates #14.",
    });
  });

  it("asks for the steps of a bug without labelling it", () => {
    const plan = planFor({
      answers: { ...confidentBug, check_steps: { noul: 0.2, type: "noul" } },
    });

    expect(plan.labels).not.toContain("needs-reproduction");
    expect(plan.gaps).toContainEqual({
      owner: "author",
      text: "Add the steps that reproduce the bug.",
    });
  });

  it("applies only labels of the taxonomy", () => {
    const names = new Set(LABELS.map((label) => label.name));
    const plan = planFor({
      answers: {
        ...confidentBug,
        good_first_issue: { noul: 0.99, type: "noul" },
        security: { noul: 0.99, type: "noul" },
      },
    });

    expect(plan.labels.every((label) => names.has(label))).toBe(true);
  });
});

describe("buildQuestions", () => {
  it("stays within the sixteen questions a request allows", () => {
    const questions = buildQuestions("issue", [{ number: 3, title: "x" }]);

    expect(Object.keys(questions).length).toBeLessThanOrEqual(16);
  });

  it("asks pull requests about their description, not newcomers", () => {
    const questions = buildQuestions("pull-request", []);

    expect(questions.good_first_issue).toBeUndefined();
    expect(questions.pr_summary).toBeDefined();
    expect(questions.pr_docs).toBeDefined();
  });

  it("asks no question whose answer has no label or use", () => {
    const questions = buildQuestions("issue", []);

    expect(questions.area).toBeUndefined();
    expect(questions.breaking_change).toBeUndefined();
    expect(questions.performance).toBeUndefined();
  });
});

describe("taxonomy", () => {
  it("defines the twelve labels once", () => {
    const names = LABELS.map((label) => label.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names.toSorted()).toEqual(
      [
        "good first issue",
        "help wanted",
        "impact: high",
        "impact: low",
        "impact: medium",
        "priority: high",
        "priority: low",
        "priority: medium",
        "type: bug",
        "type: documentation",
        "type: feature",
        "type: maintenance",
      ].toSorted()
    );
  });
});

const goodFirstIssueAt = (noul: number, overrides: Partial<PlanInput> = {}) =>
  planFor({
    answers: { ...confidentBug, good_first_issue: { noul, type: "noul" } },
    ...overrides,
  });

describe("good first issue", () => {
  it("needs a stricter probability than the priority signals", () => {
    expect(goodFirstIssueAt(MIN_SIGNAL_PROBABILITY).labels).not.toContain(
      "good first issue"
    );

    expect(
      goodFirstIssueAt(MIN_GOOD_FIRST_ISSUE_PROBABILITY - 0.01).labels
    ).not.toContain("good first issue");

    expect(goodFirstIssueAt(MIN_GOOD_FIRST_ISSUE_PROBABILITY).labels).toContain(
      "good first issue"
    );
  });

  it("waits until the issue is ready", () => {
    const plan = goodFirstIssueAt(0.99, {
      answers: {
        ...confidentBug,
        check_steps: { noul: 0.1, type: "noul" },
        good_first_issue: { noul: 0.99, type: "noul" },
      },
    });

    expect(plan.readiness).toBe("needs-info");
    expect(plan.labels).not.toContain("good first issue");
  });

  it("is never added to a pull request", () => {
    const plan = goodFirstIssueAt(0.99, {
      checklist: undefined,
      kind: "pull-request",
    });

    expect(plan.labels).not.toContain("good first issue");
  });

  it("is not added back after someone removed it", () => {
    const plan = goodFirstIssueAt(0.99, {
      refusedLabels: ["good first issue"],
    });

    expect(plan.labels).not.toContain("good first issue");
  });
});

describe("Still to define", () => {
  const open = ["Pick the export format", "Decide who can see it"];

  it("holds back good first issue while items are open", () => {
    const plan = goodFirstIssueAt(0.99, { stillToDefine: open });

    expect(plan.labels).not.toContain("good first issue");
    expect(plan.readiness).toBe("needs-triage");
    expect(plan.gaps).toContainEqual({
      owner: "maintainer",
      text: "Settle the 2 open items under Still to define.",
    });
  });

  it("removes good first issue and help wanted while items are open", () => {
    const plan = planFor({
      existingLabels: ["good first issue", "help wanted", "type: bug"],
      stillToDefine: ["Pick the export format"],
    });

    expect(plan.removed.toSorted()).toEqual([
      "good first issue",
      "help wanted",
    ]);

    expect(plan.gaps).toContainEqual({
      owner: "maintainer",
      text: "Settle the 1 open item under Still to define.",
    });
  });

  it("keeps the contributor labels once the list is empty", () => {
    const plan = planFor({
      existingLabels: ["good first issue", "help wanted"],
      stillToDefine: [],
    });

    expect(plan.removed).toEqual([]);
  });
});

describe("derivePriority", () => {
  it("maps impact to priority", () => {
    expect(derivePriority("impact: high", [])).toBe("priority: high");
    expect(derivePriority("impact: medium", [])).toBe("priority: medium");
    expect(derivePriority("impact: low", [])).toBe("priority: low");
    expect(derivePriority(undefined, [])).toBeUndefined();
  });

  it("raises a regression one level and puts security first", () => {
    expect(derivePriority("impact: low", ["regression"])).toBe(
      "priority: medium"
    );

    expect(derivePriority("impact: medium", ["regression"])).toBe(
      "priority: high"
    );

    expect(derivePriority("impact: high", ["regression"])).toBe(
      "priority: high"
    );

    expect(derivePriority("impact: low", ["security"])).toBe("priority: high");
    expect(derivePriority(undefined, ["security"])).toBe("priority: high");
  });

  it("gives a regression with no impact no priority", () => {
    expect(derivePriority(undefined, ["regression"])).toBeUndefined();
  });
});

const unsureImpact: Answers = {
  ...confidentBug,
  impact: { confidence: 0.3, score: 2, type: "score" },
  regression: { noul: 0.1, type: "noul" },
};

describe("justified impact and priority", () => {
  it("applies no impact and no priority below the confidence bar", () => {
    const plan = planFor({ answers: unsureImpact });

    expect(plan.labels.some((label) => label.startsWith("impact:"))).toBe(
      false
    );

    expect(plan.labels.some((label) => label.startsWith("priority:"))).toBe(
      false
    );

    expect(plan.notes).toContain(
      `impact: impact: high (score 2.00, 0.30); below ${MIN_IMPACT_CONFIDENCE.toFixed(2)}, no label`
    );

    expect(plan.notes).toContain("priority: none (from no justified impact)");
  });

  it("applies an impact at the confidence bar", () => {
    const plan = planFor({
      answers: {
        ...unsureImpact,
        impact: { confidence: MIN_IMPACT_CONFIDENCE, score: 0, type: "score" },
      },
    });

    expect(plan.labels).toContain("impact: low");
    expect(plan.labels).toContain("priority: low");
  });

  it("derives priority from an impact label a maintainer set", () => {
    const plan = planFor({
      answers: unsureImpact,
      existingLabels: ["impact: high"],
    });

    expect(plan.labels).toContain("priority: high");
  });

  it("gives a security issue high priority without an impact", () => {
    const plan = planFor({
      answers: { ...unsureImpact, security: { noul: 0.9, type: "noul" } },
    });

    expect(plan.labels).toContain("priority: high");
    expect(plan.labels.some((label) => label.startsWith("impact:"))).toBe(
      false
    );
  });

  it("keeps a priority a maintainer set and closes the comment", () => {
    const plan = planFor({ existingLabels: ["priority: low"] });

    expect(plan.labels.some((label) => label.startsWith("priority:"))).toBe(
      false
    );

    expect(plan.comment).toBe(false);
  });
});

describe("workflow priority", () => {
  it("recomputes its own priority after a maintainer changes impact", () => {
    const plan = planFor({
      answers: { ...confidentBug, regression: { noul: 0.1, type: "noul" } },
      existingLabels: ["impact: high", "priority: low"],
      workflowPriorities: ["priority: low"],
    });

    expect(plan.labels).toContain("priority: high");
    expect(plan.removed).toContain("priority: low");
    expect(plan.comment).toBe(true);
  });

  it("keeps its own priority when the answer is the same", () => {
    const plan = planFor({
      existingLabels: ["priority: high"],
      workflowPriorities: ["priority: high"],
    });

    expect(plan.labels).not.toContain("priority: high");
    expect(plan.removed).toEqual([]);
  });

  it("removes its own priority once a maintainer sets one", () => {
    const plan = planFor({
      existingLabels: ["priority: low", "priority: high"],
      workflowPriorities: ["priority: low"],
    });

    expect(plan.removed).toContain("priority: low");
    expect(plan.labels.some((label) => label.startsWith("priority:"))).toBe(
      false
    );
  });

  it("removes its own priority once the impact is no longer justified", () => {
    const plan = planFor({
      answers: unsureImpact,
      existingLabels: ["priority: high"],
      workflowPriorities: ["priority: high"],
    });

    expect(plan.removed).toEqual(["priority: high"]);
  });
});

describe("readiness and comment", () => {
  it("raises no gap or comment for a low-confidence type", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: { choice: "maintenance", confidence: 0.1, type: "choice" },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: maintenance");
    expect(plan.readiness).toBe("ready");
    expect(renderGapComment("issue", plan.gaps)).toBeUndefined();
  });

  it("posts no comment on a blocked item", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        blocked: { noul: 0.9, type: "noul" },
        check_steps: { noul: 0.1, type: "noul" },
      },
    });

    expect(plan.readiness).toBe("blocked");
    expect(plan.comment).toBe(false);
  });
});

const impactAt = (score: number) =>
  planFor({
    answers: {
      ...confidentBug,
      impact: { confidence: 0.9, score, type: "score" },
      regression: { noul: 0.1, type: "noul" },
    },
  }).labels;

describe("tie order", () => {
  it("follows the option order of the type question", () => {
    const issue = buildQuestions("issue", []);
    const pullRequest = buildQuestions("pull-request", []);

    expect(Object.keys(issue.type?.criteria ?? {})).toEqual([
      ...TYPE_TIE_ORDER,
    ]);

    expect(Object.keys(pullRequest.type?.criteria ?? {})).toEqual([
      ...TYPE_TIE_ORDER,
    ]);

    expect(IMPACT_TIE_ORDER).toEqual([
      "impact: high",
      "impact: medium",
      "impact: low",
    ]);
  });

  it("breaks an exact type tie by question order on every run", () => {
    const tied: Answers = {
      ...confidentBug,
      type: {
        choice: "feature",
        confidence: 0.4,
        probabilities: { bug: 0.4, feature: 0.4, maintenance: 0.2 },
        type: "choice",
      },
    };

    const runs = [1, 2, 3].map(() =>
      planFor({ answers: tied }).labels.filter((label) =>
        label.startsWith("type:")
      )
    );

    expect(runs).toEqual([["type: bug"], ["type: bug"], ["type: bug"]]);
  });

  it("rounds an impact score exactly halfway up and caps it at high", () => {
    expect(impactAt(0.5)).toContain("impact: medium");
    expect(impactAt(1.5)).toContain("impact: high");
    expect(impactAt(1.5)).toContain("priority: high");
    expect(impactAt(3)).toContain("impact: high");
  });
});

describe("unusable answers", () => {
  it("falls back to the highest probability for an unknown choice", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: {
          choice: "question",
          confidence: 0.7,
          probabilities: { documentation: 0.5, feature: 0.2, question: 0.7 },
          type: "choice",
        },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: documentation");
    expect(plan.notes).toContain(
      "type: documentation (0.50; next feature 0.20)"
    );
  });

  it("labels nothing and asks nothing for a missing type answer", () => {
    const { type: _type, ...withoutType } = confidentBug;
    const plan = planFor({ answers: withoutType, checklist: undefined });

    expect(plan.labels.some((label) => label.startsWith("type:"))).toBe(false);
    expect(plan.gaps).toEqual([]);
    expect(plan.readiness).toBe("ready");
    expect(plan.notes).toContain("type: no answer");
  });

  it("notes no answer for a wrong answer type", () => {
    const plan = planFor({
      answers: { ...confidentBug, impact: { noul: 0.9, type: "noul" } },
    });

    expect(plan.notes).toContain("impact: no answer");
    expect(plan.labels.some((label) => label.startsWith("impact:"))).toBe(
      false
    );

    expect(plan.gaps).toEqual([]);
  });

  it("notes the impact pick with its runner-up", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        impact: {
          confidence: 0.85,
          probabilities: { "0": 0.1, "1": 0.45, "2": 0.45 },
          score: 1.5,
          type: "score",
        },
      },
    });

    expect(plan.notes).toContain(
      "impact: impact: high (score 1.50, 0.85; next impact: medium 0.45)"
    );
  });
});

describe("existing and refused labels", () => {
  it("never adds a pick over an existing group label and removes nothing", () => {
    const plan = planFor({
      existingLabels: ["type: feature", "impact: low"],
    });

    expect(
      plan.labels.filter(
        (label) => label.startsWith("type:") || label.startsWith("impact:")
      )
    ).toEqual([]);

    expect(plan.removed).toEqual([]);
  });

  it("adds no type once a maintainer removed the top one", () => {
    const plan = planFor({ refusedLabels: ["type: bug"] });

    expect(plan.labels.some((label) => label.startsWith("type:"))).toBe(false);
  });

  it("treats a label of the old taxonomy as a settled group", () => {
    const plan = planFor({
      existingLabels: ["type:bug", "impact:low", "priority:p3"],
    });

    expect(plan.labels).toEqual([]);
  });
});

const BAD_REQUEST = 400;

describe("decide", () => {
  afterEach(() => {
    mock.restore();
  });

  it("asks SubQ with the subq-snap-1.1 model", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        answers: { type: { choice: "bug", confidence: 1, type: "choice" } },
      })
    );

    const answers = await Effect.runPromise(decide("key", {}, {}));
    const requestBodies = fetchSpy.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body))
    );

    expect(answers.type?.type).toBe("choice");
    expect(requestBodies).toEqual([
      { model: "subq-snap-1.1", questions: {}, state: {} },
    ]);
  });

  it("fails with the request error when SubQ rejects the call", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad", { status: BAD_REQUEST })
    );

    const failure = await Effect.runPromise(
      decide("key", {}, {}).pipe(Effect.flip)
    );

    expect(failure).toBeInstanceOf(SubqRequestFailed);
    expect(failure.reason).toEqual({
      body: "bad",
      kind: "rejected",
      status: BAD_REQUEST,
    });
  });
});
