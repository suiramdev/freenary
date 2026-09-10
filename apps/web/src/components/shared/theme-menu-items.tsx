import { MenuItem } from "@freenary/ui/components/menu-item";
import { useTheme } from "next-themes";

import { m } from "@/paraglide/messages.js";

const THEME_OPTIONS = [
  { getLabel: m.theme_system, value: "system" },
  { getLabel: m.theme_dark, value: "dark" },
  { getLabel: m.theme_light, value: "light" },
] as const;

export const THEME_OPTION_COUNT = THEME_OPTIONS.length;

export const ThemeMenuItems = ({ startIndex = 0 }: { startIndex?: number }) => {
  const { setTheme, theme } = useTheme();

  return (
    <>
      {THEME_OPTIONS.map(({ getLabel, value }, position) => (
        <MenuItem
          checked={theme === value}
          index={startIndex + position}
          key={value}
          label={getLabel()}
          onSelect={() => setTheme(value)}
        />
      ))}
    </>
  );
};
