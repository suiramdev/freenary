import { cn } from "@freenary/ui/lib/utils";

import { SUPPORTED_COUNTRY_CODES } from "@/lib/onboarding/countries";
import type { Country } from "@/lib/onboarding/countries";

interface CountryOptionProps {
  country: Country;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

export const CountryOption = ({
  country,
  isSelected,
  onSelect,
}: CountryOptionProps) => {
  const supported = SUPPORTED_COUNTRY_CODES.has(country.code);
  let stateClass: string;
  if (!supported) {
    stateClass =
      "border-border bg-muted text-muted-foreground cursor-not-allowed";
  } else if (isSelected) {
    stateClass = "border-primary bg-secondary text-foreground";
  } else {
    stateClass =
      "border-border bg-card hover:border-primary hover:bg-muted text-foreground";
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 border px-4 py-3 text-left text-sm transition-colors",
        stateClass
      )}
      disabled={!supported}
      onClick={() => onSelect(country.code)}
      type="button"
    >
      <span className="text-xl">{country.flag}</span>
      <span className="font-medium">{country.name}</span>
      {!supported && (
        <span className="text-muted-foreground ml-auto text-xs">
          Not supported yet
        </span>
      )}
    </button>
  );
};
