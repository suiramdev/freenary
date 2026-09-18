import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiArrowRightLine, RiEarthLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { CountryOption } from "@/components/onboarding/country-option";
import { OnboardingStepHeader } from "@/components/onboarding/onboarding-step-header";
import { SearchInput } from "@/components/shared/search-input";
import { GITHUB_REPO_URL } from "@/lib/constants";
import { filterCountries } from "@/lib/onboarding/countries";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

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
  const locale = getLocale();

  const localizedMatches = useMemo(
    () => filterCountries(search, locale),
    [search, locale]
  );

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader
        description={m.onboarding_country_description()}
        title={m.onboarding_country_title()}
      />
      <SearchInput
        onChange={setSearch}
        placeholder={m.onboarding_country_search_placeholder()}
        value={search}
      />
      {localizedMatches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiEarthLine />
            </EmptyMedia>
            <EmptyTitle>{m.onboarding_country_empty()}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto">
          {localizedMatches.map((country) => (
            <CountryOption
              key={country.code}
              country={country}
              isSelected={selected === country.code}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-center text-xs">
        {m.onboarding_contribute_prompt()}{" "}
        <a
          className="text-primary underline underline-offset-2"
          href={GITHUB_REPO_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {m.onboarding_contribute_link()}
        </a>
      </p>
      <div className="flex justify-end">
        <Button
          disabled={!selected || isCompleting}
          onClick={onContinue}
          type="button"
        >
          {m.onboarding_continue()}
          {isCompleting ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <RiArrowRightLine data-icon="inline-end" />
          )}
        </Button>
      </div>
    </div>
  );
};
