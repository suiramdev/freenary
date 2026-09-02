import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@freenary/ui/components/dropdown-menu";
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

/**
 * The appearance choices themselves, so the login screen, the onboarding header
 * and the sidebar offer one list instead of three.
 *
 * Unlike the locale, the choice needs no reload: it lives in the browser and the
 * class on `<html>` is swapped in place. `system` follows the operating system
 * from then on, including a change made while the page stays open.
 */
export const ThemeMenuItems = () => {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenuRadioGroup value={theme}>
      {THEME_OPTIONS.map(({ label, value }) => (
        <DropdownMenuRadioItem
          key={value}
          onClick={() => setTheme(value)}
          value={value}
        >
          {label()}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
};
