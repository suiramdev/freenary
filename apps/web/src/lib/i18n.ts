import type { Locale } from "@/paraglide/runtime.js";

/**
 * Endonyms, deliberately untranslated: someone looking for their language
 * recognizes "Français", not "French" rendered in a language they don't read.
 */
export const LOCALE_LABELS = {
  en: "English",
  fr: "Français",
} satisfies Record<Locale, string>;
