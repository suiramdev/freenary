import { m } from "@/paraglide/messages.js";
import { LocaleSelect } from "@/shared/ui/locale-select";
import { ThemeSelect } from "@/shared/ui/theme-select";

import { SettingsSection } from "./settings-section";

export const AppearanceThemeSection = () => (
  <SettingsSection
    action={<ThemeSelect />}
    description={m.settings_appearance_theme_description()}
    title={m.theme_switcher_label()}
  />
);

export const AppearanceLocaleSection = () => (
  <SettingsSection
    action={<LocaleSelect />}
    description={m.settings_appearance_locale_description()}
    title={m.locale_switcher_label()}
  />
);
