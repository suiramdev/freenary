import { describe, expect, it } from "bun:test";

import { apportion } from "./apportion";

const end = (id: string, value: number) => ({ id, value });

const inboundOf = (
  links: { source: string; target: string; value: number }[],
  target: string
) =>
  links
    .filter((link) => link.target === target)
    .reduce((total, link) => total + link.value, 0);

describe("apportion", () => {
  it("fills every target exactly when income covers them", () => {
    const targets = [end("housing", 1080), end("daily", 595), end("left", 725)];
    const links = apportion([end("salary", 2400)], targets);

    for (const target of targets) {
      expect(inboundOf(links, target.id)).toBe(target.value);
    }
  });

  it("draws from as few sources as possible", () => {
    // Linking every source to every target would be 3x3 = 9 ribbons.
    const links = apportion(
      [end("a", 100), end("b", 100), end("c", 100)],
      [end("x", 100), end("y", 100), end("z", 100)]
    );

    expect(links).toHaveLength(3);
    expect(links.map((link) => `${link.source}->${link.target}`)).toEqual([
      "a->x",
      "b->y",
      "c->z",
    ]);
  });

  it("splits a target across sources only at the boundary", () => {
    const links = apportion(
      [end("salary", 150), end("dividends", 150)],
      [end("rent", 100), end("food", 100), end("fun", 100)]
    );

    expect(links).toEqual([
      { source: "salary", target: "rent", value: 100 },
      { source: "salary", target: "food", value: 50 },
      { source: "dividends", target: "food", value: 50 },
      { source: "dividends", target: "fun", value: 100 },
    ]);
  });

  it("leaves trailing targets unfunded when income falls short", () => {
    // An overspent period: the shortfall shows as groups with no inbound ribbon.
    const links = apportion(
      [end("salary", 120)],
      [end("rent", 100), end("food", 100)]
    );

    expect(inboundOf(links, "rent")).toBe(100);
    expect(inboundOf(links, "food")).toBe(20);
    expect(links.every((link) => link.value > 0)).toBe(true);
  });

  it("never routes more than a source holds", () => {
    const links = apportion(
      [end("salary", 100)],
      [end("rent", 500), end("food", 500)]
    );

    const routed = links.reduce((total, link) => total + link.value, 0);
    expect(routed).toBe(100);
  });

  it("emits nothing for empty sides", () => {
    expect(apportion([], [end("rent", 100)])).toEqual([]);
    expect(apportion([end("salary", 100)], [])).toEqual([]);
  });

  it("skips ends that cannot contribute without stalling", () => {
    // NaN compares false both ways, so retrying such a source would spin forever.
    const links = apportion(
      [end("zero", 0), end("nan", Number.NaN), end("salary", 100)],
      [end("empty", 0), end("rent", 100)]
    );

    expect(links).toEqual([{ source: "salary", target: "rent", value: 100 }]);
  });

  it("ignores a target it cannot measure", () => {
    const links = apportion(
      [end("salary", 100)],
      [end("broken", Number.NaN), end("rent", 100)]
    );

    expect(links).toEqual([{ source: "salary", target: "rent", value: 100 }]);
  });

  it("never emits a non-finite ribbon", () => {
    // The layout does arithmetic on a ribbon's value, so Infinity must not reach it.
    const infinite = apportion(
      [end("inf", Number.POSITIVE_INFINITY)],
      [end("inf", Number.POSITIVE_INFINITY)]
    );
    expect(infinite).toEqual([]);

    // An unbounded source still fills finite targets exactly.
    const bounded = apportion(
      [end("inf", Number.POSITIVE_INFINITY)],
      [end("rent", 100), end("food", 50)]
    );
    expect(bounded).toEqual([
      { source: "inf", target: "rent", value: 100 },
      { source: "inf", target: "food", value: 50 },
    ]);
  });
});
