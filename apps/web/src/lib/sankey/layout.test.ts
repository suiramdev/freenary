import { describe, expect, test } from "bun:test";

import { computeSankeyLayout } from "./layout";
import type { SankeyLayout, SankeyNode } from "./layout";

// Column geometry the three-column engine produced before it was generalized:
// usable = CHART_WIDTH(700) - PAD.left(12) - PAD.right(12) = 676,
// colW = 676 * 0.22 = 148.72, gapW = (676 - 3 * colW) / 2 = 114.92.
const THREE_COLUMN_X = [12, 275.64, 539.28];

const node = (id: string, value: number): SankeyNode => ({
  color: "blue",
  id,
  label: id,
  value,
});

const cashFlow = () =>
  computeSankeyLayout({
    columns: [
      [node("salary", 2000), node("dividends", 500)],
      [node("hub", 2500)],
      [node("rent", 1500), node("food", 1000)],
    ],
    links: [
      { source: "salary", target: "hub", value: 2000 },
      { source: "dividends", target: "hub", value: 500 },
      { source: "hub", target: "rent", value: 1500 },
      { source: "hub", target: "food", value: 1000 },
    ],
  });

const bandOf = (layout: SankeyLayout, source: string, target: string) =>
  layout.links.find(
    (band) => band.sourceId === source && band.targetId === target
  );

describe("computeSankeyLayout", () => {
  test("keeps the three-column geometry the cash-flow chart was built on", () => {
    const layout = cashFlow();

    expect(layout.columnCount).toBe(3);
    expect(layout.width).toBe(700);

    for (const [column, x] of THREE_COLUMN_X.entries()) {
      const columnNodes = layout.nodes.filter((rect) => rect.column === column);
      expect(columnNodes.length).toBeGreaterThan(0);
      for (const rect of columnNodes) {
        expect(rect.x).toBeCloseTo(x, 2);
      }
    }
  });

  test("stacks inbound ribbons to exactly fill the hub", () => {
    const layout = cashFlow();
    const hub = layout.nodes.find((rect) => rect.id === "hub");
    if (!hub) {
      throw new Error("hub node missing from layout");
    }

    const inbound = layout.links.filter((band) => band.targetId === "hub");
    const stacked = inbound.reduce(
      (total, band) => total + (band.ty1 - band.ty0),
      0
    );

    expect(inbound).toHaveLength(2);
    expect(stacked).toBeCloseTo(hub.h, 5);
  });

  test("spans a target's full height when it has a single inbound ribbon", () => {
    const layout = cashFlow();
    const rent = layout.nodes.find((rect) => rect.id === "rent");
    const band = bandOf(layout, "hub", "rent");
    if (!(rent && band)) {
      throw new Error("rent node or ribbon missing from layout");
    }

    expect(band.ty0).toBeCloseTo(rent.y, 5);
    expect(band.ty1).toBeCloseTo(rent.y + rent.h, 5);
  });

  test("emits ribbons between the third and fourth columns", () => {
    const layout = computeSankeyLayout({
      columns: [
        [node("salary", 2500)],
        [node("budget", 2500)],
        [node("housing", 620), node("unallocated", 1880)],
        [node("rent", 500), node("charges", 120)],
      ],
      links: [
        { source: "salary", target: "budget", value: 2500 },
        { source: "budget", target: "housing", value: 620 },
        { source: "budget", target: "unallocated", value: 1880 },
        { source: "housing", target: "rent", value: 500 },
        { source: "housing", target: "charges", value: 120 },
      ],
    });

    expect(layout.columnCount).toBe(4);
    expect(bandOf(layout, "housing", "rent")).toBeDefined();
    expect(bandOf(layout, "housing", "charges")).toBeDefined();

    let previousX = Number.NEGATIVE_INFINITY;
    for (const column of [0, 1, 2, 3]) {
      const first = layout.nodes.find((rect) => rect.column === column);
      if (!first) {
        throw new Error(`column ${column} is empty`);
      }
      expect(first.x).toBeGreaterThan(previousX);
      previousX = first.x;
    }

    // The two ribbons out of `housing` stack rather than overlap.
    const rent = bandOf(layout, "housing", "rent");
    const charges = bandOf(layout, "housing", "charges");
    if (!(rent && charges)) {
      throw new Error("housing ribbons missing from layout");
    }
    expect(charges.sy0).toBeCloseTo(rent.sy1, 5);
  });

  test("produces finite geometry for a zero-valued node", () => {
    const layout = computeSankeyLayout({
      columns: [[node("empty", 0)], [node("hub", 0)]],
      links: [{ source: "empty", target: "hub", value: 0 }],
    });

    for (const rect of layout.nodes) {
      expect(Number.isFinite(rect.h)).toBe(true);
      expect(Number.isFinite(rect.y)).toBe(true);
    }
    for (const band of layout.links) {
      expect(Number.isFinite(band.sy0)).toBe(true);
      expect(Number.isFinite(band.sy1)).toBe(true);
      expect(Number.isFinite(band.ty0)).toBe(true);
      expect(Number.isFinite(band.ty1)).toBe(true);
    }
    expect(Number.isFinite(layout.height)).toBe(true);
  });

  test("emits no band for a non-positive link", () => {
    const layout = computeSankeyLayout({
      columns: [
        [node("salary", 100)],
        [node("hub", 100)],
        [node("rent", 100), node("food", 0), node("extra", 0)],
      ],
      links: [
        { source: "salary", target: "hub", value: 100 },
        { source: "hub", target: "rent", value: 100 },
        { source: "hub", target: "food", value: 0 },
        { source: "hub", target: "extra", value: -20 },
      ],
    });

    expect(bandOf(layout, "hub", "food")).toBeUndefined();
    expect(bandOf(layout, "hub", "extra")).toBeUndefined();

    // The skipped links consumed no ports, so rent's ribbon spans the hub.
    const hub = layout.nodes.find((rect) => rect.id === "hub");
    const rent = bandOf(layout, "hub", "rent");
    expect(hub && rent && rent.sy1 - rent.sy0 === hub.h).toBe(true);
  });
});
