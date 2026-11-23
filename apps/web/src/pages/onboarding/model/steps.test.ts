import { describe, expect, it } from "bun:test";

import { ONBOARDING_STEPS, resumedStep } from "./steps";

describe("resumedStep", () => {
  it("starts on the country step without a saved state", () => {
    expect(resumedStep(null)).toBe(ONBOARDING_STEPS.country);
  });

  it("asks for the budget month once the countries are saved", () => {
    expect(resumedStep({ taxCountries: ["FR"] })).toBe(
      ONBOARDING_STEPS.budgetMonth
    );
  });

  it("returns to the bank step after a bank redirect", () => {
    expect(resumedStep({ budgetMonthStartDay: 28, taxCountries: ["FR"] })).toBe(
      ONBOARDING_STEPS.bank
    );
  });
});
