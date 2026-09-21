import type {
  CategoryColor,
  CategoryIconName,
} from "@freenary/api/lib/taxonomy";

import { m } from "@/paraglide/messages.js";

export const CATEGORY_COLOR_LABELS = {
  blue: m.settings_color_blue,
  green: m.settings_color_green,
  grey: m.settings_color_grey,
  orange: m.settings_color_orange,
  pink: m.settings_color_pink,
  purple: m.settings_color_purple,
  red: m.settings_color_red,
} satisfies Record<CategoryColor, () => string>;

export const CATEGORY_ICON_LABELS = {
  AirplaneIcon: m.settings_icon_airplane,
  ArrowsLeftRightIcon: m.settings_icon_arrows_left_right,
  BankIcon: m.settings_icon_bank,
  BitcoinIcon: m.settings_icon_bitcoin,
  BriefcaseIcon: m.settings_icon_briefcase,
  CarIcon: m.settings_icon_car,
  CashIcon: m.settings_icon_cash,
  ChartPieIcon: m.settings_icon_chart_pie,
  CoinsIcon: m.settings_icon_coins,
  DotsThreeIcon: m.settings_icon_dots_three,
  FilmSlateIcon: m.settings_icon_film_slate,
  FirstAidIcon: m.settings_icon_first_aid,
  ForkKnifeIcon: m.settings_icon_fork_knife,
  GraduationCapIcon: m.settings_icon_graduation_cap,
  HouseIcon: m.settings_icon_house,
  KeyIcon: m.settings_icon_key,
  LightningIcon: m.settings_icon_lightning,
  PiggyBankIcon: m.settings_icon_piggy_bank,
  PlantIcon: m.settings_icon_plant,
  ReceiptIcon: m.settings_icon_receipt,
  RefundIcon: m.settings_icon_refund,
  RepeatIcon: m.settings_icon_repeat,
  ShieldCheckIcon: m.settings_icon_shield_check,
  ShoppingBagIcon: m.settings_icon_shopping_bag,
  ShoppingCartIcon: m.settings_icon_shopping_cart,
  StorefrontIcon: m.settings_icon_storefront,
  TrendUpIcon: m.settings_icon_trend_up,
  UsersIcon: m.settings_icon_users,
} satisfies Record<CategoryIconName, () => string>;
