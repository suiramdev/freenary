import { describe, expect, test } from "bun:test";

import { LABEL_INSET, LABEL_MIN_H, computeSankeyLayout } from "./layout";
import type { SankeyLayout, SankeyNode } from "./layout";

const node = (id: string, value: number): SankeyNode => ({
  color: "blue",
  id,
  label: id,
  value,
});

/** Small enough that `stackColumn` floors it below `LABEL_MIN_H`, so it labels beside itself. */
const SHORT_VALUE = 20;
const TALL_VALUE = 1000;

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
      { source: "a-tall", target: "b-tall", value: TALL_VALUE },
      { source: "b-tall", target: "c-tall", value: TALL_VALUE },
    ],
  });

const contestedColumns = () => [
  [node("a-tall", TALL_VALUE), node("a-short", SHORT_VALUE)],
  [node("b-tall", TALL_VALUE), node("b-short", SHORT_VALUE)],
  [node("c-tall", TALL_VALUE)],
];

describe("label budget", () => {
  test("short nodes really do label beside themselves", () => {
    // The rest of the suite is meaningless if these end up tall enough to fit
    // their label inside.
    const layout = flow(contestedColumns());
    expect(budgetOf(layout, "a-short").h).toBeLessThan(LABEL_MIN_H);
    expect(budgetOf(layout, "b-short").h).toBeLessThan(LABEL_MIN_H);
    expect(budgetOf(layout, "a-tall").h).toBeGreaterThanOrEqual(LABEL_MIN_H);
  });

  test("splits the gap when the first two columns both aim at it", () => {
    const layout = flow(contestedColumns());
    const first = budgetOf(layout, "a-short");
    const second = budgetOf(layout, "b-short");

    // Both stacks put their short node on the same rows, so each takes half.
    expect(first.y).toBe(second.y);
    expect(first.labelBudget).toBeCloseTo(second.labelBudget, 5);

    const uncontested = budgetOf(
      flow([
        [node("a-tall", TALL_VALUE), node("a-short", SHORT_VALUE)],
        [node("b-tall", TALL_VALUE)],
        [node("c-tall", TALL_VALUE)],
      ]),
      "a-short"
    );
    expect(first.labelBudget + LABEL_INSET).toBeCloseTo(
      (uncontested.labelBudget + LABEL_INSET) / 2,
      5
    );
  });

  test("keeps the whole gap when nothing else aims at it", () => {
    // Column 1 is a single tall node, so it labels inside and contests nothing.
    const layout = flow([
      [node("a-tall", TALL_VALUE), node("a-short", SHORT_VALUE)],
      [node("b-tall", TALL_VALUE)],
      [node("c-tall", TALL_VALUE)],
    ]);
    const first = budgetOf(layout, "a-short");
    const contested = budgetOf(flow(contestedColumns()), "a-short");

    expect(first.labelBudget).toBeGreaterThan(contested.labelBudget);
  });

  test("leaves the gap whole when the short nodes miss each other's rows", () => {
    // Column 1's short node sits below column 0's, so their labels cannot meet.
    const layout = flow([
      [node("a-short", SHORT_VALUE), node("a-tall", TALL_VALUE)],
      [node("b-tall", TALL_VALUE), node("b-short", SHORT_VALUE)],
      [node("c-tall", TALL_VALUE)],
    ]);
    const first = budgetOf(layout, "a-short");
    const contested = budgetOf(flow(contestedColumns()), "a-short");

    expect(first.labelBudget).toBeGreaterThan(contested.labelBudget);
  });

  test("never promises room past the canvas when no column follows", () => {
    // A lone column has no gap to write into, so its budget cannot be positive.
    const layout = computeSankeyLayout({
      columns: [[node("a-tall", TALL_VALUE), node("a-short", SHORT_VALUE)]],
      links: [],
    });

    expect(budgetOf(layout, "a-short").labelBudget).toBe(0);
  });

  test("gives every node a budget", () => {
    const layout = flow(contestedColumns());
    for (const rect of layout.nodes) {
      expect(rect.labelBudget).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(rect.labelBudget)).toBe(true);
    }
  });
});
