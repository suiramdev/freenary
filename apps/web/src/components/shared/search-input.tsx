import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

interface SearchInputProps {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export const SearchInput = ({
  onChange,
  placeholder,
  value,
}: SearchInputProps) => (
  // Opaque: the onboarding wizard sits on the animated shader, which shows
  // through the control's default translucent fill.
  <InputGroup className="bg-background">
    <InputGroupAddon>
      <MagnifyingGlassIcon />
    </InputGroupAddon>
    <InputGroupInput
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  </InputGroup>
);
