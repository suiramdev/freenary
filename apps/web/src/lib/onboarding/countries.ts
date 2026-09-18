import { foldForSearch } from "@/lib/search-text";
import type { Locale } from "@/paraglide/runtime.js";

export interface Country {
  code: string;
  flag: string;
  name: string;
}

const FULLY_SUPPORTED_COUNTRY_CODES = { FR: true } as const;

export const isFullySupportedCountry = (code: string): boolean =>
  Object.hasOwn(FULLY_SUPPORTED_COUNTRY_CODES, code);

const ISO_ALPHA2_COUNTRY_CODES = [
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

const flagOf = (code: string) =>
  String.fromCodePoint(
    ...Array.from(
      code,
      (letter) => REGIONAL_INDICATOR_A + LETTERS.indexOf(letter)
    )
  );

const fullySupportedFirstThenLocalName =
  (collator: Intl.Collator) => (a: Country, b: Country) => {
    const bySupport =
      Number(isFullySupportedCountry(b.code)) -
      Number(isFullySupportedCountry(a.code));

    return bySupport || collator.compare(a.name, b.name);
  };

const countriesByLocale = new Map<Locale, readonly Country[]>();

export const countriesFor = (locale: Locale): readonly Country[] => {
  const cached = countriesByLocale.get(locale);

  if (cached) {
    return cached;
  }

  const names = new Intl.DisplayNames(locale, { type: "region" });
  const collator = new Intl.Collator(locale);
  const countries = ISO_ALPHA2_COUNTRY_CODES.map((code) => ({
    code,
    flag: flagOf(code),
    name: names.of(code) ?? code,
  })).toSorted(fullySupportedFirstThenLocalName(collator));

  countriesByLocale.set(locale, countries);

  return countries;
};

export const countryName = (code: string, locale: Locale): string =>
  countriesFor(locale).find((country) => country.code === code)?.name ?? code;

export const countryMatches = (
  code: string,
  name: string,
  query: string
): boolean => {
  const needle = foldForSearch(query.trim());

  return (
    needle === "" ||
    foldForSearch(name).includes(needle) ||
    code.toLowerCase().includes(needle)
  );
};
