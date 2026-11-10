import { describe, expect, it } from "bun:test";

import { bankDayLabel } from "./day-label";

const TODAY = new Date(2026, 10, 10, 15);

describe("bankDayLabel", () => {
  it("names today and yesterday", () => {
    expect(bankDayLabel("2026-11-10T00:00:00.000Z", TODAY, "en")).toBe("Today");
    expect(bankDayLabel("2026-11-09T00:00:00.000Z", TODAY, "fr")).toBe("Hier");
  });

  it("gives the day and month within the year", () => {
    expect(bankDayLabel("2026-11-07T00:00:00.000Z", TODAY, "en")).toBe("Nov 7");
  });

  it("adds the year to a day from another year", () => {
    expect(bankDayLabel("2025-12-24T00:00:00.000Z", TODAY, "en")).toBe(
      "Dec 24, 2025"
    );
  });
});
