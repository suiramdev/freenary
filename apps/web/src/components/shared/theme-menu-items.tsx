import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@freenary/ui/components/dropdown-menu";
import { useTheme } from "next-themes";

import { m } from "@/paraglide/messages.js";

const THEME_OPTIONS = [
  { getLabel: m.theme_system, value: "system" },
  { getLabel: m.theme_dark, value: "dark" },
  { getLabel: m.theme_light, value: "light" },
] as const;

export const ThemeMenuItems = () => {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenuRadioGroup value={theme}>
      {THEME_OPTIONS.map(({ getLabel, value }) => (
        <DropdownMenuRadioItem
          key={value}
          onClick={() => setTheme(value)}
          value={value}
        >
          {getLabel()}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
};
