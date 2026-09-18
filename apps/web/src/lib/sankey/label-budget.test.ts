import { describe, expect, test } from "bun:test";

import { LABEL_INSET, LABEL_MIN_H, computeSankeyLayout } from "./layout";
import type { SankeyLayout, SankeyNode } from "./layout";

const node = (id: string, value: number): SankeyNode => ({
  color: "blue",
  id,
  label: id,
  value,
});

const SHORT_ENOUGH_TO_LABEL_BESIDE = 20;
const TALL_ENOUGH_TO_LABEL_INSIDE = 1000;
const CONTESTED_GAP_SHARES = 2;

const budgetOf = (layout: SankeyLayout, id: string) => {
  const rect = layout.nodes.find((candidate) => candidate.id === id);

  if (!rect) {
    throw new Error(`node ${id} missing from layout`);
  }

  return rect;
};

const flow = (columns: SankeyNode[][]) =>
  computeSankeyLayout({
    columns,
    links: [
      {
        source: "a-tall",
        target: "b-tall",
        value: TALL_ENOUGH_TO_LABEL_INSIDE,
      },
      {
        source: "b-tall",
        target: "c-tall",
        value: TALL_ENOUGH_TO_LABEL_INSIDE,
      },
    ],
  });

const bothColumnsAimAtTheGap = () => [
  [
    node("a-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
    node("a-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
  ],
  [
    node("b-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
    node("b-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
  ],
  [node("c-tall", TALL_ENOUGH_TO_LABEL_INSIDE)],
];

const secondColumnLabelsInside = () => [
  [
    node("a-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
    node("a-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
  ],
  [node("b-tall", TALL_ENOUGH_TO_LABEL_INSIDE)],
  [node("c-tall", TALL_ENOUGH_TO_LABEL_INSIDE)],
];

const shortNodesOnDifferentRows = () => [
  [
    node("a-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
    node("a-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
  ],
  [
    node("b-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
    node("b-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
  ],
  [node("c-tall", TALL_ENOUGH_TO_LABEL_INSIDE)],
];

describe("label budget", () => {
  test("short nodes really do label beside themselves", () => {
    const layout = flow(bothColumnsAimAtTheGap());

    expect(budgetOf(layout, "a-short").h).toBeLessThan(LABEL_MIN_H);
    expect(budgetOf(layout, "b-short").h).toBeLessThan(LABEL_MIN_H);
    expect(budgetOf(layout, "a-tall").h).toBeGreaterThanOrEqual(LABEL_MIN_H);
  });

  test("splits the gap when the first two columns both aim at it", () => {
    const layout = flow(bothColumnsAimAtTheGap());
    const first = budgetOf(layout, "a-short");
    const second = budgetOf(layout, "b-short");

    expect(first.y).toBe(second.y);
    expect(first.labelBudget).toBeCloseTo(second.labelBudget, 5);

    const uncontested = budgetOf(flow(secondColumnLabelsInside()), "a-short");

    expect(first.labelBudget + LABEL_INSET).toBeCloseTo(
      (uncontested.labelBudget + LABEL_INSET) / CONTESTED_GAP_SHARES,
      5
    );
  });

  test("keeps the whole gap when nothing else aims at it", () => {
    const first = budgetOf(flow(secondColumnLabelsInside()), "a-short");
    const contested = budgetOf(flow(bothColumnsAimAtTheGap()), "a-short");

    expect(first.labelBudget).toBeGreaterThan(contested.labelBudget);
  });

  test("leaves the gap whole when the short nodes miss each other's rows", () => {
    const first = budgetOf(flow(shortNodesOnDifferentRows()), "a-short");
    const contested = budgetOf(flow(bothColumnsAimAtTheGap()), "a-short");

    expect(first.labelBudget).toBeGreaterThan(contested.labelBudget);
  });

  test("never promises room past the chart edge when no column follows", () => {
    const layout = computeSankeyLayout({
      columns: [
        [
          node("a-tall", TALL_ENOUGH_TO_LABEL_INSIDE),
          node("a-short", SHORT_ENOUGH_TO_LABEL_BESIDE),
        ],
      ],
      links: [],
    });

    expect(budgetOf(layout, "a-short").labelBudget).toBe(0);
  });

  test("gives every node a budget", () => {
    const layout = flow(bothColumnsAimAtTheGap());

    for (const rect of layout.nodes) {
      expect(rect.labelBudget).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(rect.labelBudget)).toBe(true);
    }
  });
});
