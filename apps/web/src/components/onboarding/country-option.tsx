import { Badge } from "@freenary/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { cn } from "@freenary/ui/lib/utils";

import type { Country } from "@/lib/onboarding/countries";
import { isFullySupportedCountry } from "@/lib/onboarding/countries";
import { m } from "@/paraglide/messages.js";

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
  const fullySupported = isFullySupportedCountry(country.code);

  return (
    <Item
      className={cn(
        "text-left",
        isSelected ? "border-primary bg-secondary" : "hover:bg-muted"
      )}
      render={
        <button
          aria-label={
            fullySupported
              ? country.name
              : m.onboarding_country_partial_label({ country: country.name })
          }
          aria-pressed={isSelected}
          type="button"
          onClick={() => onSelect(country.code)}
        />
      }
      size="sm"
      variant="outline"
    >
      <ItemMedia>
        <span className="text-xl">{country.flag}</span>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{country.name}</ItemTitle>
      </ItemContent>
      {fullySupported ? null : (
        <ItemActions>
          <Badge variant="outline">
            {m.onboarding_country_partial_badge()}
          </Badge>
        </ItemActions>
      )}
    </Item>
  );
};
