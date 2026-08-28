import { Badge } from "@freenary/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
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

  return (
    <Item
      className={cn(
        "text-left disabled:pointer-events-none disabled:opacity-50",
        isSelected ? "border-primary bg-secondary" : "hover:bg-muted"
      )}
      render={
        <button
          aria-label={
            supported ? country.name : `${country.name}, not supported yet`
          }
          aria-pressed={isSelected}
          disabled={!supported}
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
      {supported ? null : (
        <ItemActions>
          <Badge variant="outline">Not supported yet</Badge>
        </ItemActions>
      )}
    </Item>
  );
};
