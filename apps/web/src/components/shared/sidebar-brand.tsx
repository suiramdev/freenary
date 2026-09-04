import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@freenary/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { FreenaryAvatar } from "@/components/shared/freenary-avatar";
import { m } from "@/paraglide/messages.js";

/**
 * The mark at the top of the shell. Pointing at it or tabbing to it makes the
 * avatar take a coin — the greeting is the reward for noticing, so the link's
 * own hover background stays the state cue.
 */
export const SidebarBrand = () => {
  const [greeted, setGreeted] = useState(false);

  return (
    <SidebarMenu>
      {/* The handlers sit on the item, not the button: `SidebarMenuButton` with a
          `tooltip` renders a Base UI `TooltipTrigger`, which owns the button's own
          pointer handlers and drops any passed alongside them. */}
      <SidebarMenuItem
        onBlur={() => setGreeted(false)}
        onFocus={() => setGreeted(true)}
        onPointerEnter={() => setGreeted(true)}
        onPointerLeave={() => setGreeted(false)}
      >
        <SidebarMenuButton
          render={<Link to="/" />}
          size="lg"
          tooltip={m.shell_brand_tooltip()}
        >
          {/* `size-6!`, not `size-6`: the button styles every descendant svg
              with `[&_svg]:size-4`, and that descendant selector outranks a
              plain utility class on the mark itself. */}
          <FreenaryAvatar
            animation={greeted ? "greeting" : null}
            className="size-6!"
            idle={!greeted}
          />
          <span className="font-heading text-sm font-semibold tracking-tight">
            {m.shell_brand_name()}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
