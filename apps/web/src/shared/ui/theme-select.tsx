import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";
import { useTheme } from "next-themes";

import { m } from "@/paraglide/messages.js";

import { THEME_OPTIONS } from "./theme-menu-items";

const SYSTEM_THEME = "system";

const TRIGGER_WIDTH = "w-44";

export const ThemeSelect = () => {
  const { setTheme, theme } = useTheme();

  return (
    <Select onValueChange={setTheme} value={theme ?? SYSTEM_THEME}>
      <SelectTrigger
        aria-label={m.theme_switcher_label()}
        className={TRIGGER_WIDTH}
        placeholder={m.theme_switcher_label()}
      />
      <SelectContent>
        <SelectGroup>
          {THEME_OPTIONS.map(({ getLabel, value }, position) => (
            <SelectItem index={position} key={value} value={value}>
              {getLabel()}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
