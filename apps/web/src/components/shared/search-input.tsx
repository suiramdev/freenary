import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import { RiSearchLine } from "@remixicon/react";

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
  <InputGroup>
    <InputGroupAddon>
      <RiSearchLine />
    </InputGroupAddon>
    <InputGroupInput
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  </InputGroup>
);
