import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { RiContrastLine } from "@remixicon/react";

import { ThemeMenuItems } from "@/components/shared/theme-menu-items";
import { m } from "@/paraglide/messages.js";

export const ThemeSwitcher = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" />}>
      <RiContrastLine data-icon="inline-start" />
      {m.theme_switcher_label()}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuLabel>{m.theme_switcher_label()}</DropdownMenuLabel>
        <ThemeMenuItems />
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
