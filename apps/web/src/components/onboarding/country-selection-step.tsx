import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import { ArrowRight } from "@phosphor-icons/react";

import { OnboardingStepHeader } from "./onboarding-step-header";

const SUPPORTED_COUNTRIES = [
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}", name: "France" },
] as const;

interface CountrySelectionStepProps {
  onContinue: () => void;
  onSelect: (country: string) => void;
  selected: string | null;
}

export const CountrySelectionStep = ({
  onContinue,
  onSelect,
  selected,
}: CountrySelectionStepProps) => (
  <div className="space-y-6">
    <OnboardingStepHeader
      description="Select your country to personalize your experience."
      title="Where are you based?"
    />
    <div className="grid gap-2">
      {SUPPORTED_COUNTRIES.map((country) => {
        const isSelected = selected === country.code;
        return (
          <button
            key={country.code}
            type="button"
            onClick={() => onSelect(country.code)}
            className={cn(
              "flex items-center gap-3 border px-4 py-3 text-left text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
            )}
          >
            <span className="text-xl">{country.flag}</span>
            <span className="font-medium">{country.name}</span>
          </button>
        );
      })}
    </div>
    <div className="flex justify-end">
      <Button disabled={!selected} onClick={onContinue} size="lg" type="button">
        Continue
        <ArrowRight className="size-4" />
      </Button>
    </div>
  </div>
);
