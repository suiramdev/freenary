import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { RiContrastLine } from "@remixicon/react";

import {
  ThemeMenuItems,
  useThemeCheckedIndex,
} from "@/components/shared/theme-menu-items";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";

export const ThemeSwitcher = () => {
  const checkedIndex = useThemeCheckedIndex();

  return (
    <DropdownMenu>
      <DropdownTrigger
        render={
          <Button leadingIcon={remixIcon(RiContrastLine)} variant="ghost" />
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
