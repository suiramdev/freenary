import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneIcon,
  ArrowsLeftRightIcon,
  BankIcon,
  CarIcon,
  DotsThreeIcon,
  FilmSlateIcon,
  FirstAidIcon,
  ForkKnifeIcon,
  GraduationCapIcon,
  HouseIcon,
  LightningIcon,
  PiggyBankIcon,
  ReceiptIcon,
  RepeatIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  dining: ForkKnifeIcon,
  education: GraduationCapIcon,
  entertainment: FilmSlateIcon,
  groceries: StorefrontIcon,
  health: FirstAidIcon,
  housing: HouseIcon,
  income: BankIcon,
  insurance: ShieldCheckIcon,
  other: DotsThreeIcon,
  savings: PiggyBankIcon,
  shopping: ShoppingBagIcon,
  subscriptions: RepeatIcon,
  taxes: ReceiptIcon,
  transfers: ArrowsLeftRightIcon,
  transport: CarIcon,
  travel: AirplaneIcon,
  utilities: LightningIcon,
} satisfies Record<SpendingCategory, Icon>;

const CATEGORY_BG = {
  dining:
    "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  education:
    "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  entertainment:
    "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  groceries:
    "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  health: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  housing:
    "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  income: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  insurance: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  other: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  savings: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  shopping:
    "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  subscriptions:
    "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  taxes: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  transfers: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  transport: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  travel: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  utilities: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
} satisfies Record<SpendingCategory, string>;

export const CategoryIcon = ({
  category,
  className,
}: {
  category: SpendingCategory;
  className?: string;
}) => {
  const IconComponent = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
  const bg = CATEGORY_BG[category] ?? CATEGORY_BG.other;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        bg,
        className
      )}
    >
      <IconComponent weight="duotone" />
    </div>
  );
};

export { CATEGORY_ICONS };
