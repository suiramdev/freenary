import { MenuItem } from "@freenary/ui/components/menu-item";
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
    <>
      {THEME_OPTIONS.map(({ getLabel, value }, position) => (
        <MenuItem
          checked={theme === value}
          index={position}
          key={value}
          label={getLabel()}
          onSelect={() => setTheme(value)}
        />
      ))}
    </>
  );
};

export const useThemeCheckedIndex = () => {
  const { theme } = useTheme();
  const index = THEME_OPTIONS.findIndex((option) => option.value === theme);

  return index === -1 ? undefined : index;
};
