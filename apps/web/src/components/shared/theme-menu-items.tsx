import { MenuItem } from "@freenary/ui/components/menu-item";
import { useTheme } from "next-themes";

import { m } from "@/paraglide/messages.js";

/**
 * `label` holds the message function rather than its result: this module is
 * evaluated once per process, so an evaluated string would pin the first locale
 * seen and serve it to every later render.
 */
const THEME_OPTIONS = [
  { label: m.theme_system, value: "system" },
  { label: m.theme_dark, value: "dark" },
  { label: m.theme_light, value: "light" },
] as const;

export const THEME_OPTION_COUNT = THEME_OPTIONS.length;

/**
 * The appearance choices themselves, so the login screen, the onboarding header
 * and the sidebar offer one list instead of three.
 *
 * Unlike the locale, the choice needs no reload: it lives in the browser and the
 * class on `<html>` is swapped in place. `system` follows the operating system
 * from then on, including a change made while the page stays open.
 *
 * Fluid Functionalism menu rows register by flat index across the whole
 * popup, so a parent embedding these after other rows passes `startIndex`.
 */
export const ThemeMenuItems = ({ startIndex = 0 }: { startIndex?: number }) => {
  const { setTheme, theme } = useTheme();

  return (
    <>
      {THEME_OPTIONS.map(({ label, value }, position) => (
        <MenuItem
          checked={theme === value}
          index={startIndex + position}
          key={value}
          label={label()}
          onSelect={() => setTheme(value)}
        />
      ))}
    </>
  );
};
