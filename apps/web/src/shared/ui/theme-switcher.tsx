import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { Appearance } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";

import { CHART_COLOR_VARS } from "../lib/chart-colors";
import { kubaiIcon } from "../lib/kubai-icon";
import { ThemeMenuItems, useThemeCheckedIndex } from "./theme-menu-items";

export const ThemeSwitcher = () => {
  const checkedIndex = useThemeCheckedIndex();

  return (
    <DropdownMenu>
      <DropdownTrigger
        render={
          <Button
            leadingIcon={kubaiIcon(Appearance, CHART_COLOR_VARS.purple)}
            variant="ghost"
          />
        }
      >
        {m.theme_switcher_label()}
      </DropdownTrigger>
      <DropdownContent align="end" checkedIndex={checkedIndex}>
        <DropdownLabel>{m.theme_switcher_label()}</DropdownLabel>
        <ThemeMenuItems />
      </DropdownContent>
    </DropdownMenu>
  );
};
