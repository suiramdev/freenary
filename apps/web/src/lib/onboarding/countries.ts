import { foldForSearch } from "@/lib/search-text";
import type { Locale } from "@/paraglide/runtime.js";

export interface Country {
  code: string;
  flag: string;
  name: string;
}

export const SUPPORTED_COUNTRY_CODES = new Set(["FR"]);

/**
 * ISO 3166-1 alpha-2. Names and flags are derived from the code, so a country
 * costs one line here and needs no translation of its own.
 */
const COUNTRY_CODES = [
  "AF",
  "AL",
  "DZ",
  "AD",
  "AO",
  "AG",
  "AR",
  "AM",
  "AU",
  "AT",
  "AZ",
  "BS",
  "BH",
  "BD",
  "BB",
  "BY",
  "BE",
  "BZ",
  "BJ",
  "BT",
  "BO",
  "BA",
  "BW",
  "BR",
  "BN",
  "BG",
  "BF",
  "BI",
  "CV",
  "KH",
  "CM",
  "CA",
  "CF",
  "TD",
  "CL",
  "CN",
  "CO",
  "KM",
  "CG",
  "CD",
  "CR",
  "CI",
  "HR",
  "CU",
  "CY",
  "CZ",
  "DK",
  "DJ",
  "DM",
  "DO",
  "EC",
  "EG",
  "SV",
  "GQ",
  "ER",
  "EE",
  "SZ",
  "ET",
  "FJ",
  "FI",
  "FR",
  "GA",
  "GM",
  "GE",
  "DE",
  "GH",
  "GR",
  "GD",
  "GT",
  "GN",
  "GW",
  "GY",
  "HT",
  "HN",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IE",
  "IL",
  "IT",
  "JM",
  "JP",
  "JO",
  "KZ",
  "KE",
  "KI",
  "KP",
  "KR",
  "KW",
  "KG",
  "LA",
  "LV",
  "LB",
  "LS",
  "LR",
  "LY",
  "LI",
  "LT",
  "LU",
  "MG",
  "MW",
  "MY",
  "MV",
  "ML",
  "MT",
  "MH",
  "MR",
  "MU",
  "MX",
  "FM",
  "MD",
  "MC",
  "MN",
  "ME",
  "MA",
  "MZ",
  "MM",
  "NA",
  "NR",
  "NP",
  "NL",
  "NZ",
  "NI",
  "NE",
  "NG",
  "MK",
  "NO",
  "OM",
  "PK",
  "PW",
  "PS",
  "PA",
  "PG",
  "PY",
  "PE",
  "PH",
  "PL",
  "PT",
  "QA",
  "RO",
  "RU",
  "RW",
  "KN",
  "LC",
  "VC",
  "WS",
  "SM",
  "ST",
  "SA",
  "SN",
  "RS",
  "SC",
  "SL",
  "SG",
  "SK",
  "SI",
  "SB",
  "SO",
  "ZA",
  "SS",
  "ES",
  "LK",
  "SD",
  "SR",
  "SE",
  "CH",
  "SY",
  "TW",
  "TJ",
  "TZ",
  "TH",
  "TL",
  "TG",
  "TO",
  "TT",
  "TN",
  "TR",
  "TM",
  "TV",
  "UG",
  "UA",
  "AE",
  "GB",
  "US",
  "UY",
  "UZ",
  "VU",
  "VA",
  "VE",
  "VN",
  "YE",
  "ZM",
  "ZW",
] as const;

const REGIONAL_INDICATOR_A = 0x1_f1_e6;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** "FR" → 🇫🇷: a flag is its two letters written as regional-indicator symbols. */
const flagOf = (code: string) =>
  String.fromCodePoint(
    ...Array.from(
      code,
      (letter) => REGIONAL_INDICATOR_A + LETTERS.indexOf(letter)
    )
  );

// Naming and sorting 196 regions is the whole cost of this screen, and the
// search box would otherwise redo it on every keystroke.
const byLocale = new Map<Locale, readonly Country[]>();

const countriesIn = (locale: Locale): readonly Country[] => {
  const cached = byLocale.get(locale);
  if (cached) {
    return cached;
  }

  const names = new Intl.DisplayNames(locale, { type: "region" });
  const collator = new Intl.Collator(locale);
  const countries = COUNTRY_CODES.map((code) => ({
    code,
    flag: flagOf(code),
    name: names.of(code) ?? code,
  })).toSorted((a, b) => {
    // Countries you can actually connect a bank in come first; the rest are
    // alphabetical in the reader's own language, not in English.
    const bySupport =
      Number(SUPPORTED_COUNTRY_CODES.has(b.code)) -
      Number(SUPPORTED_COUNTRY_CODES.has(a.code));
    return bySupport || collator.compare(a.name, b.name);
  });

  byLocale.set(locale, countries);
  return countries;
};

export const filterCountries = (
  search: string,
  locale: Locale
): readonly Country[] => {
  const countries = countriesIn(locale);
  const query = foldForSearch(search.trim());

  return query
    ? countries.filter(
        (country) =>
          foldForSearch(country.name).includes(query) ||
          country.code.toLowerCase().includes(query)
      )
    : countries;
};
