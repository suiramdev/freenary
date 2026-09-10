import type { IconComponent, IconName } from "@freenary/ui/lib/icon-context";
import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiComputerLine,
  RiExpandUpDownLine,
  RiFileCopyLine,
  RiLoader4Line,
  RiMenuLine,
  RiMoonLine,
  RiMore2Line,
  RiMoreLine,
  RiSearchLine,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
  RiSunLine,
} from "@remixicon/react";

import { remixIcon } from "@/lib/remix-icon";

/**
 * The Fluid Functionalism primitives draw their internal glyphs (chevrons,
 * checks, the search magnifier…) through named icon slots that default to
 * Lucide. This app's icon library is Remix Icon, so the shared slots are
 * overridden here; names left out keep their Lucide default.
 */
export const ffIcons = {
  "arrow-down": remixIcon(RiArrowDownLine),
  "arrow-left": remixIcon(RiArrowLeftLine),
  "arrow-right": remixIcon(RiArrowRightLine),
  "arrow-up": remixIcon(RiArrowUpLine),
  calendar: remixIcon(RiCalendarLine),
  check: remixIcon(RiCheckLine),
  "chevron-down": remixIcon(RiArrowDownSLine),
  "chevron-right": remixIcon(RiArrowRightSLine),
  "chevrons-up-down": remixIcon(RiExpandUpDownLine),
  copy: remixIcon(RiFileCopyLine),
  loader: remixIcon(RiLoader4Line),
  menu: remixIcon(RiMenuLine),
  monitor: remixIcon(RiComputerLine),
  moon: remixIcon(RiMoonLine),
  "more-horizontal": remixIcon(RiMoreLine),
  "more-vertical": remixIcon(RiMore2Line),
  "panel-left": remixIcon(RiSidebarFoldLine),
  "panel-right": remixIcon(RiSidebarUnfoldLine),
  search: remixIcon(RiSearchLine),
  sun: remixIcon(RiSunLine),
  x: remixIcon(RiCloseLine),
} satisfies Partial<Record<IconName, IconComponent>>;
