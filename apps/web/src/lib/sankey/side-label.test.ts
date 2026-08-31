import { describe, expect, it } from "bun:test";

import { fitSideLabel } from "./side-label";

const DIGIT = /\d/u;

/**
 * The invariant, stated without assuming where the currency symbol sits:
 * a result either carries the amount in full or carries no digits at all.
 * `formatCurrency` uses the ambient locale, so the symbol may lead (`€216.40`)
 * or trail (`216,40 €`), and a symbol-shaped regex would miss a digit-side cut.
 */
const amountWholeOrAbsent = (fitted: string, value: string) =>
  fitted.includes(value) || !DIGIT.test(fitted);

describe("fitSideLabel", () => {
  it("keeps both when they fit", () => {
    expect(fitSideLabel("Rent", "€1,080.00", 20)).toBe("Rent: €1,080.00");
  });

  it("trims the label, never the amount", () => {
    const fitted = fitSideLabel("Public transport", "€216.40", 23);
    expect(fitted).toBe("Public transp…: €216.40");
  });

  it("drops the amount whole rather than slicing it", () => {
    // "Salary: €2,500.00" in 11 chars used to render "Salary: €2…", which reads
    // as €2 — a plausible figure three orders of magnitude out.
    expect(fitSideLabel("Salary", "€2,500.00", 11)).toBe("Salary");
  });

  it("would reject the outputs the old slicing produced", () => {
    // Guards the guard: these are the real pre-fix renders, and the invariant
    // must call every one of them a violation.
    for (const [broken, value] of [
      ["Salary: €2…", "€2,500.00"],
      ["Culture & events: €95.…", "€95.00"],
      ["Public transport: €216…", "€216.40"],
      ["Salary: 216,4…", "216,40\u00A0€"],
    ] as const) {
      expect(amountWholeOrAbsent(broken, value)).toBe(false);
    }
  });

  it("never emits a partial amount, wherever the symbol sits", () => {
    const amounts = [
      "€2,500.00",
      "€216.40",
      "€95.00",
      "€1.00",
      "€1,234,567.89",
      // Trailing symbol with a non-breaking space, as fr-FR formats it.
      "2\u202F500,00\u00A0€",
      "216,40\u00A0€",
    ];
    // Digit-free labels, so any digit in a result can only come from the amount.
    const labels = ["Salary", "Public transport", "Culture & events", "Rent"];

    for (const label of labels) {
      for (const value of amounts) {
        for (let maxChars = 0; maxChars <= 40; maxChars += 1) {
          const fitted = fitSideLabel(label, value, maxChars);
          if (fitted === null) {
            continue;
          }
          expect(amountWholeOrAbsent(fitted, value)).toBe(true);
          expect(fitted.length).toBeLessThanOrEqual(maxChars);
        }
      }
    }
  });

  it("truncates a label too long to fit on its own", () => {
    expect(fitSideLabel("Extraordinarily long name", "€5.00", 10)).toBe(
      "Extraordi…"
    );
  });

  it("returns null when nothing useful fits", () => {
    expect(fitSideLabel("Rent", "€1.00", 4)).toBeNull();
    expect(fitSideLabel("Rent", "€1.00", 0)).toBeNull();
  });
});
