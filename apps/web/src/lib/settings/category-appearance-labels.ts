import type {
  CategoryColor,
  CategoryIconName,
} from "@freenary/api/lib/taxonomy";

import { m } from "@/paraglide/messages.js";

/**
 * Human names for the swatches and glyphs in the custom-category drawer: the
 * toggles carry no visible text, so the enum value used to be the whole
 * accessible name — "AirplaneIcon", in every language.
 *
 * Message getters rather than strings: calling them here would pin the locale
 * of whichever request loaded the module first.
 */
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
  CarIcon: m.settings_icon_car,
  CoinsIcon: m.settings_icon_coins,
  DotsThreeIcon: m.settings_icon_dots_three,
  FilmSlateIcon: m.settings_icon_film_slate,
  FirstAidIcon: m.settings_icon_first_aid,
  ForkKnifeIcon: m.settings_icon_fork_knife,
  GraduationCapIcon: m.settings_icon_graduation_cap,
  HouseIcon: m.settings_icon_house,
  LightningIcon: m.settings_icon_lightning,
  PiggyBankIcon: m.settings_icon_piggy_bank,
  ReceiptIcon: m.settings_icon_receipt,
  RepeatIcon: m.settings_icon_repeat,
  ShieldCheckIcon: m.settings_icon_shield_check,
  ShoppingBagIcon: m.settings_icon_shopping_bag,
  StorefrontIcon: m.settings_icon_storefront,
} satisfies Record<CategoryIconName, () => string>;
