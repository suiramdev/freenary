import { Input } from "@freenary/ui/components/input";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface OnboardingSearchInputProps {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export const OnboardingSearchInput = ({
  onChange,
  placeholder,
  value,
}: OnboardingSearchInputProps) => (
  <div className="relative">
    <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
    <Input
      className="bg-background pl-8"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  </div>
);
