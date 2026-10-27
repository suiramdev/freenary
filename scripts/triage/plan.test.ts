import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { Effect } from "effect";

import { renderGapComment } from "./comment";
import {
  derivePriority,
  GOOD_FIRST_ISSUE_TIE_ORDER,
  IMPACT_TIE_ORDER,
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
  impact: { choice: "high", confidence: 0.85, type: "choice" },
  regression: { noul: 0.1, type: "noul" },
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
    workflowGoodFirstIssue: false,
    workflowPriorities: [],
    ...overrides,
  });

const startsWithAny = (label: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => label.startsWith(prefix));

const duplicateAt = (probabilities: Record<string, number>) =>
  planFor({
    answers: {
      ...confidentBug,
      duplicate: {
        choice: "item-14",
        confidence: 0.4,
        probabilities,
        type: "choice",
      },
    },
  }).duplicateOf;

describe("planLabels", () => {
  it("labels the type, impact and priority of a confident answer set", () => {
    expect(planFor({}).labels.toSorted()).toEqual(
      ["impact: high", "priority: high", "type: bug"].toSorted()
    );
  });

  it("never adds a status, area or signal label", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        regression: { noul: 0.95, type: "noul" },
        security: { noul: 0.95, type: "noul" },
      },
    });

    expect(
      plan.labels.some((label) =>
        startsWithAny(label, ["status:", "area:", "security", "regression"])
      )
    ).toBe(false);
  });

  it("applies a narrow top type and notes its runner-up", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: {
          choice: "feature",
          confidence: 0.49,
          probabilities: { bug: 0.05, documentation: 0.46, feature: 0.49 },
          type: "choice",
        },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: feature");
    expect(plan.notes).toContain(
      "type: feature (0.49; next documentation 0.46)"
    );
  });

  it("never overrides a group a maintainer already labelled", () => {
    const plan = planFor({
      existingLabels: ["type: feature", "impact: low", "priority: low"],
    });

    expect(plan.labels).toEqual([]);
    expect(plan.removed).toEqual([]);
  });

  it("flags a duplicate without a label", () => {
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

  it("flags the most probable duplicate at any confidence", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        duplicate: {
          choice: "none",
          confidence: 0.3,
          probabilities: { "item-14": 0.4, "item-9": 0.3, none: 0.3 },
          type: "choice",
        },
      },
    });

    expect(plan.duplicateOf).toBe(14);
  });

  it("flags nothing when none is the top duplicate answer", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        duplicate: { choice: "none", confidence: 0.2, type: "choice" },
      },
    });

    expect(plan.duplicateOf).toBeUndefined();
    expect(plan.gaps).toEqual([]);
  });

  it("breaks an exact duplicate tie toward none, then the lowest number", () => {
    expect(duplicateAt({ "item-14": 0.4, none: 0.4 })).toBeUndefined();
    expect(duplicateAt({ "item-14": 0.4, "item-9": 0.4, none: 0.2 })).toBe(9);
  });

  it("counts a group a maintainer labelled as settled", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: { choice: "bug", confidence: 0.3, type: "choice" },
      },
      existingLabels: ["type: feature"],
    });

    expect(plan.status).toBe("ready");
  });
});

describe("buildQuestions", () => {
  it("stays within the sixteen questions a request allows", () => {
    const questions = buildQuestions("issue", [{ number: 3, title: "x" }]);

    expect(Object.keys(questions).length).toBeLessThanOrEqual(16);
  });

  it("asks pull requests about their description, not newcomers or impact", () => {
    const questions = buildQuestions("pull-request", []);

    expect(questions.good_first_issue).toBeUndefined();
    expect(questions.impact).toBeUndefined();
    expect(questions.area).toBeUndefined();
    expect(questions.pr_summary).toBeDefined();
    expect(questions.pr_docs).toBeDefined();
  });

  it("asks for three impact levels", () => {
    expect(
      Object.keys(buildQuestions("issue", []).impact?.criteria ?? {}).toSorted()
    ).toEqual([...IMPACT_TIE_ORDER].toSorted());
  });

  it("asks one choice per model-driven label group", () => {
    const questions = buildQuestions("issue", [{ number: 3, title: "x" }]);

    expect(questions.type?.type).toBe("choice");
    expect(questions.impact?.type).toBe("choice");
    expect(questions.good_first_issue?.type).toBe("choice");
    expect(questions.duplicate?.type).toBe("choice");
    expect(Object.keys(questions.good_first_issue?.criteria ?? {})).toEqual([
      "no",
      "none",
      "yes",
    ]);
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

const goodFirstIssue = (
  choice: string,
  probabilities: Record<string, number> | undefined = undefined
): Answers => ({
  ...confidentBug,
  good_first_issue: { choice, confidence: 0.1, probabilities, type: "choice" },
});

describe("good first issue", () => {
  it("applies the label only for a top yes, at any confidence", () => {
    expect(planFor({ answers: goodFirstIssue("yes") }).labels).toContain(
      "good first issue"
    );

    for (const choice of ["no", "none"]) {
      expect(planFor({ answers: goodFirstIssue(choice) }).labels).not.toContain(
        "good first issue"
      );
    }
  });

  it("follows the probabilities over the stated choice", () => {
    const plan = planFor({
      answers: goodFirstIssue("none", { no: 0.1, none: 0.3, yes: 0.6 }),
    });

    expect(plan.labels).toContain("good first issue");
  });

  it("breaks an exact tie toward none, then no", () => {
    expect(GOOD_FIRST_ISSUE_TIE_ORDER).toEqual(["none", "no", "yes"]);

    for (const probabilities of [
      { no: 0.2, none: 0.4, yes: 0.4 },
      { no: 0.4, none: 0.2, yes: 0.4 },
    ]) {
      const plan = planFor({ answers: goodFirstIssue("yes", probabilities) });

      expect(plan.labels).not.toContain("good first issue");
    }
  });

  it("is withheld until the spec is complete", () => {
    const plan = planFor({
      answers: goodFirstIssue("yes"),
      ruleGaps: [{ owner: "author", text: "Add steps." }],
    });

    expect(plan.labels).not.toContain("good first issue");
    expect(plan.notes).toContain(
      "good first issue: withheld until the spec is complete"
    );
  });

  it("is not applied without a usable answer", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        good_first_issue: { noul: 0.99, type: "noul" },
      },
    });

    expect(plan.labels).not.toContain("good first issue");
  });
});

describe("derivePriority", () => {
  it("maps impact to priority", () => {
    expect(derivePriority("impact: high", [])).toBe("priority: high");
    expect(derivePriority("impact: medium", [])).toBe("priority: medium");
    expect(derivePriority("impact: low", [])).toBe("priority: low");
    expect(derivePriority(undefined, [])).toBeUndefined();
  });

  it("gives a security risk priority high, with or without an impact", () => {
    expect(derivePriority("impact: low", ["security"])).toBe("priority: high");
    expect(derivePriority(undefined, ["security"])).toBe("priority: high");
  });

  it("raises the priority of an impact by one level for a regression", () => {
    expect(derivePriority("impact: low", ["regression"])).toBe(
      "priority: medium"
    );

    expect(derivePriority("impact: medium", ["regression"])).toBe(
      "priority: high"
    );

    expect(derivePriority("impact: high", ["regression"])).toBe(
      "priority: high"
    );
  });

  it("gives a regression with no impact no priority", () => {
    expect(derivePriority(undefined, ["regression"])).toBeUndefined();
  });
});

const impact = (
  choice: string,
  probabilities: Record<string, number> | undefined = undefined
): Answers => ({
  ...confidentBug,
  impact: { choice, confidence: 0.1, probabilities, type: "choice" },
});

describe("impact and priority", () => {
  it("applies the most probable impact and its priority at any confidence", () => {
    for (const level of ["low", "medium", "high"]) {
      const plan = planFor({ answers: impact(level) });

      expect(plan.labels).toContain(`impact: ${level}`);
      expect(plan.labels).toContain(`priority: ${level}`);
    }
  });

  it("follows the probabilities over the stated choice", () => {
    const plan = planFor({
      answers: impact("high", { high: 0.05, low: 0.9, medium: 0.05 }),
    });

    expect(plan.labels).toContain("impact: low");
    expect(plan.labels).toContain("priority: low");
  });

  it("breaks an exact impact tie toward the higher level", () => {
    const plan = planFor({
      answers: impact("low", { high: 0.4, low: 0.4, medium: 0.2 }),
    });

    expect(plan.labels).toContain("impact: high");
  });

  it("applies neither without a usable impact answer", () => {
    for (const answer of [
      { choice: "severe", confidence: 0.9, type: "choice" as const },
      { confidence: 0.9, score: 2, type: "score" as const },
    ]) {
      const plan = planFor({
        answers: {
          ...confidentBug,
          impact: answer,
          security: { noul: 0.99, type: "noul" },
        },
      });

      expect(
        plan.labels.some((label) =>
          startsWithAny(label, ["impact:", "priority:"])
        )
      ).toBe(false);
    }
  });

  it("applies neither to a pull request", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        pr_docs: { noul: 0.9, type: "noul" },
        pr_summary: { noul: 0.9, type: "noul" },
      },
      checklist: undefined,
      kind: "pull-request",
    });

    expect(
      plan.labels.some((label) =>
        startsWithAny(label, ["impact:", "priority:"])
      )
    ).toBe(false);
  });

  it("raises priority for a confident security signal", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        impact: { choice: "low", confidence: 0.9, type: "choice" },
        security: { noul: 0.9, type: "noul" },
      },
    });

    expect(plan.labels).toContain("impact: low");
    expect(plan.labels).toContain("priority: high");
  });

  it("ignores a security or regression signal below the threshold", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        impact: { choice: "low", confidence: 0.9, type: "choice" },
        regression: { noul: MIN_SIGNAL_PROBABILITY - 0.01, type: "noul" },
        security: { noul: 0.5, type: "noul" },
      },
    });

    expect(plan.labels).toContain("priority: low");
  });

  it("raises regression priority by one level", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        impact: { choice: "low", confidence: 0.9, type: "choice" },
        regression: { noul: 0.99, type: "noul" },
      },
    });

    expect(plan.labels).toContain("priority: medium");
  });
});

describe("planLabels priority", () => {
  it("derives priority from an impact label a maintainer set", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        impact: { choice: "low", confidence: 0.3, type: "choice" },
      },
      existingLabels: ["impact: medium"],
    });

    expect(plan.labels).toContain("priority: medium");
  });

  it("keeps a priority a maintainer set", () => {
    const plan = planFor({ existingLabels: ["priority: low"] });

    expect(plan.labels.some((label) => label.startsWith("priority:"))).toBe(
      false
    );
  });
});

describe("workflow priority", () => {
  it("recomputes its own priority after a maintainer changes impact", () => {
    const plan = planFor({
      existingLabels: ["impact: low", "priority: high", "type: bug"],
      workflowPriorities: ["priority: high"],
    });

    expect(plan.labels).toContain("priority: low");
    expect(plan.removed).toContain("priority: high");
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
});

describe("top label wins", () => {
  it("applies the top type at any confidence", () => {
    for (const confidence of [0, 0.1, 0.34, 0.59, 0.6, 1]) {
      const plan = planFor({
        answers: {
          ...confidentBug,
          type: { choice: "maintenance", confidence, type: "choice" },
        },
      });

      expect(plan.labels).toContain("type: maintenance");
    }
  });

  it("raises no gap for a low-confidence type", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: { choice: "bug", confidence: 0.1, type: "choice" },
      },
    });

    expect(plan.gaps).toEqual([]);
    expect(plan.status).toBe("ready");
    expect(renderGapComment("issue", plan.gaps)).toBeUndefined();
  });

  it("applies the top of a three-way spread", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: {
          choice: "feature",
          confidence: 0.34,
          probabilities: { bug: 0.33, documentation: 0.33, feature: 0.34 },
          type: "choice",
        },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: feature");
  });
});

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
  });

  it("gives an impact tie to the higher level", () => {
    expect(IMPACT_TIE_ORDER).toEqual(["high", "medium", "low"]);
  });

  it("breaks an exact type tie by question order on every run", () => {
    const tied: Answers = {
      ...confidentBug,
      type: {
        choice: "feature",
        confidence: 0.4,
        probabilities: { bug: 0.4, documentation: 0.2, feature: 0.4 },
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
});

describe("unusable answers", () => {
  it("falls back to the highest probability for an unknown choice", () => {
    const plan = planFor({
      answers: {
        ...confidentBug,
        type: {
          choice: "question",
          confidence: 0.7,
          probabilities: {
            documentation: 0.2,
            feature: 0.5,
            question: 0.7,
          },
          type: "choice",
        },
      },
      checklist: undefined,
    });

    expect(plan.labels).toContain("type: feature");
    expect(plan.notes).toContain(
      "type: feature (0.50; next documentation 0.20)"
    );
  });

  it("labels nothing and asks nothing for a missing type answer", () => {
    const { type: _type, ...withoutType } = confidentBug;
    const plan = planFor({ answers: withoutType, checklist: undefined });

    expect(plan.labels.some((label) => label.startsWith("type:"))).toBe(false);
    expect(plan.gaps).toEqual([]);
    expect(plan.status).toBe("ready");
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
  });
});

describe("existing and refused labels", () => {
  it("never adds a pick over an existing group label and removes nothing", () => {
    const plan = planFor({
      existingLabels: ["type: bug", "impact: low"],
    });

    expect(
      plan.labels.filter((label) => startsWithAny(label, ["type:", "impact:"]))
    ).toEqual([]);

    expect(plan.removed).toEqual([]);
  });

  it("adds nothing for a label a maintainer removed", () => {
    const plan = planFor({ refusedLabels: ["impact: high", "priority: high"] });

    expect(plan.labels).toEqual(["type: bug"]);
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
