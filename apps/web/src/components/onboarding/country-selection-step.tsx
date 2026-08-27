import { Button } from "@freenary/ui/components/button";
import { ArrowRight, SpinnerGapIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { CountryOption } from "@/components/onboarding/country-option";
import { OnboardingSearchInput } from "@/components/onboarding/onboarding-search-input";
import { OnboardingStepHeader } from "@/components/onboarding/onboarding-step-header";
import { GITHUB_REPO_URL } from "@/lib/constants";
import { filterCountries } from "@/lib/onboarding/countries";

interface CountrySelectionStepProps {
  isCompleting: boolean;
  onContinue: () => void;
  onSelect: (country: string) => void;
  selected: string | null;
}

export const CountrySelectionStep = ({
  isCompleting,
  onContinue,
  onSelect,
  selected,
}: CountrySelectionStepProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => filterCountries(search), [search]);

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        description="Select your country to personalize your experience."
        title="Where are you based?"
      />
      <OnboardingSearchInput
        onChange={setSearch}
        placeholder="Search countries..."
        value={search}
      />
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No countries match your search.
          </p>
        )}
        {filtered.map((country) => (
          <CountryOption
            key={country.code}
            country={country}
            isSelected={selected === country.code}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Want to add support for your country?{" "}
        <a
          className="text-primary underline underline-offset-2"
          href={GITHUB_REPO_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Contribute here
        </a>
      </p>
      <div className="flex justify-end">
        <Button
          disabled={!selected || isCompleting}
          onClick={onContinue}
          size="lg"
          type="button"
        >
          Continue
          {isCompleting ? (
            <SpinnerGapIcon className="size-3.5 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
