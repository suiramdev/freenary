import { Button } from "@freenary/ui/components/button";
import { Input } from "@freenary/ui/components/input";
import { cn } from "@freenary/ui/lib/utils";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { GITHUB_REPO_URL } from "@/lib/constants";
import { OnboardingStepHeader } from "./onboarding-step-header";

type Country = { code: string; flag: string; name: string };

const SUPPORTED_CODES = new Set(["FR"]);

const COUNTRIES: Country[] = [
  { code: "AF", flag: "\u{1F1E6}\u{1F1EB}", name: "Afghanistan" },
  { code: "AL", flag: "\u{1F1E6}\u{1F1F1}", name: "Albania" },
  { code: "DZ", flag: "\u{1F1E9}\u{1F1FF}", name: "Algeria" },
  { code: "AD", flag: "\u{1F1E6}\u{1F1E9}", name: "Andorra" },
  { code: "AO", flag: "\u{1F1E6}\u{1F1F4}", name: "Angola" },
  { code: "AG", flag: "\u{1F1E6}\u{1F1EC}", name: "Antigua and Barbuda" },
  { code: "AR", flag: "\u{1F1E6}\u{1F1F7}", name: "Argentina" },
  { code: "AM", flag: "\u{1F1E6}\u{1F1F2}", name: "Armenia" },
  { code: "AU", flag: "\u{1F1E6}\u{1F1FA}", name: "Australia" },
  { code: "AT", flag: "\u{1F1E6}\u{1F1F9}", name: "Austria" },
  { code: "AZ", flag: "\u{1F1E6}\u{1F1FF}", name: "Azerbaijan" },
  { code: "BS", flag: "\u{1F1E7}\u{1F1F8}", name: "Bahamas" },
  { code: "BH", flag: "\u{1F1E7}\u{1F1ED}", name: "Bahrain" },
  { code: "BD", flag: "\u{1F1E7}\u{1F1E9}", name: "Bangladesh" },
  { code: "BB", flag: "\u{1F1E7}\u{1F1E7}", name: "Barbados" },
  { code: "BY", flag: "\u{1F1E7}\u{1F1FE}", name: "Belarus" },
  { code: "BE", flag: "\u{1F1E7}\u{1F1EA}", name: "Belgium" },
  { code: "BZ", flag: "\u{1F1E7}\u{1F1FF}", name: "Belize" },
  { code: "BJ", flag: "\u{1F1E7}\u{1F1EF}", name: "Benin" },
  { code: "BT", flag: "\u{1F1E7}\u{1F1F9}", name: "Bhutan" },
  { code: "BO", flag: "\u{1F1E7}\u{1F1F4}", name: "Bolivia" },
  { code: "BA", flag: "\u{1F1E7}\u{1F1E6}", name: "Bosnia and Herzegovina" },
  { code: "BW", flag: "\u{1F1E7}\u{1F1FC}", name: "Botswana" },
  { code: "BR", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil" },
  { code: "BN", flag: "\u{1F1E7}\u{1F1F3}", name: "Brunei" },
  { code: "BG", flag: "\u{1F1E7}\u{1F1EC}", name: "Bulgaria" },
  { code: "BF", flag: "\u{1F1E7}\u{1F1EB}", name: "Burkina Faso" },
  { code: "BI", flag: "\u{1F1E7}\u{1F1EE}", name: "Burundi" },
  { code: "CV", flag: "\u{1F1E8}\u{1F1FB}", name: "Cabo Verde" },
  { code: "KH", flag: "\u{1F1F0}\u{1F1ED}", name: "Cambodia" },
  { code: "CM", flag: "\u{1F1E8}\u{1F1F2}", name: "Cameroon" },
  { code: "CA", flag: "\u{1F1E8}\u{1F1E6}", name: "Canada" },
  { code: "CF", flag: "\u{1F1E8}\u{1F1EB}", name: "Central African Republic" },
  { code: "TD", flag: "\u{1F1F9}\u{1F1E9}", name: "Chad" },
  { code: "CL", flag: "\u{1F1E8}\u{1F1F1}", name: "Chile" },
  { code: "CN", flag: "\u{1F1E8}\u{1F1F3}", name: "China" },
  { code: "CO", flag: "\u{1F1E8}\u{1F1F4}", name: "Colombia" },
  { code: "KM", flag: "\u{1F1F0}\u{1F1F2}", name: "Comoros" },
  { code: "CG", flag: "\u{1F1E8}\u{1F1EC}", name: "Congo" },
  { code: "CD", flag: "\u{1F1E8}\u{1F1E9}", name: "Congo (DRC)" },
  { code: "CR", flag: "\u{1F1E8}\u{1F1F7}", name: "Costa Rica" },
  { code: "CI", flag: "\u{1F1E8}\u{1F1EE}", name: "C\u00f4te d\u2019Ivoire" },
  { code: "HR", flag: "\u{1F1ED}\u{1F1F7}", name: "Croatia" },
  { code: "CU", flag: "\u{1F1E8}\u{1F1FA}", name: "Cuba" },
  { code: "CY", flag: "\u{1F1E8}\u{1F1FE}", name: "Cyprus" },
  { code: "CZ", flag: "\u{1F1E8}\u{1F1FF}", name: "Czechia" },
  { code: "DK", flag: "\u{1F1E9}\u{1F1F0}", name: "Denmark" },
  { code: "DJ", flag: "\u{1F1E9}\u{1F1EF}", name: "Djibouti" },
  { code: "DM", flag: "\u{1F1E9}\u{1F1F2}", name: "Dominica" },
  { code: "DO", flag: "\u{1F1E9}\u{1F1F4}", name: "Dominican Republic" },
  { code: "EC", flag: "\u{1F1EA}\u{1F1E8}", name: "Ecuador" },
  { code: "EG", flag: "\u{1F1EA}\u{1F1EC}", name: "Egypt" },
  { code: "SV", flag: "\u{1F1F8}\u{1F1FB}", name: "El Salvador" },
  { code: "GQ", flag: "\u{1F1EC}\u{1F1F6}", name: "Equatorial Guinea" },
  { code: "ER", flag: "\u{1F1EA}\u{1F1F7}", name: "Eritrea" },
  { code: "EE", flag: "\u{1F1EA}\u{1F1EA}", name: "Estonia" },
  { code: "SZ", flag: "\u{1F1F8}\u{1F1FF}", name: "Eswatini" },
  { code: "ET", flag: "\u{1F1EA}\u{1F1F9}", name: "Ethiopia" },
  { code: "FJ", flag: "\u{1F1EB}\u{1F1EF}", name: "Fiji" },
  { code: "FI", flag: "\u{1F1EB}\u{1F1EE}", name: "Finland" },
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}", name: "France" },
  { code: "GA", flag: "\u{1F1EC}\u{1F1E6}", name: "Gabon" },
  { code: "GM", flag: "\u{1F1EC}\u{1F1F2}", name: "Gambia" },
  { code: "GE", flag: "\u{1F1EC}\u{1F1EA}", name: "Georgia" },
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany" },
  { code: "GH", flag: "\u{1F1EC}\u{1F1ED}", name: "Ghana" },
  { code: "GR", flag: "\u{1F1EC}\u{1F1F7}", name: "Greece" },
  { code: "GD", flag: "\u{1F1EC}\u{1F1E9}", name: "Grenada" },
  { code: "GT", flag: "\u{1F1EC}\u{1F1F9}", name: "Guatemala" },
  { code: "GN", flag: "\u{1F1EC}\u{1F1F3}", name: "Guinea" },
  { code: "GW", flag: "\u{1F1EC}\u{1F1FC}", name: "Guinea-Bissau" },
  { code: "GY", flag: "\u{1F1EC}\u{1F1FE}", name: "Guyana" },
  { code: "HT", flag: "\u{1F1ED}\u{1F1F9}", name: "Haiti" },
  { code: "HN", flag: "\u{1F1ED}\u{1F1F3}", name: "Honduras" },
  { code: "HU", flag: "\u{1F1ED}\u{1F1FA}", name: "Hungary" },
  { code: "IS", flag: "\u{1F1EE}\u{1F1F8}", name: "Iceland" },
  { code: "IN", flag: "\u{1F1EE}\u{1F1F3}", name: "India" },
  { code: "ID", flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesia" },
  { code: "IR", flag: "\u{1F1EE}\u{1F1F7}", name: "Iran" },
  { code: "IQ", flag: "\u{1F1EE}\u{1F1F6}", name: "Iraq" },
  { code: "IE", flag: "\u{1F1EE}\u{1F1EA}", name: "Ireland" },
  { code: "IL", flag: "\u{1F1EE}\u{1F1F1}", name: "Israel" },
  { code: "IT", flag: "\u{1F1EE}\u{1F1F9}", name: "Italy" },
  { code: "JM", flag: "\u{1F1EF}\u{1F1F2}", name: "Jamaica" },
  { code: "JP", flag: "\u{1F1EF}\u{1F1F5}", name: "Japan" },
  { code: "JO", flag: "\u{1F1EF}\u{1F1F4}", name: "Jordan" },
  { code: "KZ", flag: "\u{1F1F0}\u{1F1FF}", name: "Kazakhstan" },
  { code: "KE", flag: "\u{1F1F0}\u{1F1EA}", name: "Kenya" },
  { code: "KI", flag: "\u{1F1F0}\u{1F1EE}", name: "Kiribati" },
  { code: "KP", flag: "\u{1F1F0}\u{1F1F5}", name: "North Korea" },
  { code: "KR", flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea" },
  { code: "KW", flag: "\u{1F1F0}\u{1F1FC}", name: "Kuwait" },
  { code: "KG", flag: "\u{1F1F0}\u{1F1EC}", name: "Kyrgyzstan" },
  { code: "LA", flag: "\u{1F1F1}\u{1F1E6}", name: "Laos" },
  { code: "LV", flag: "\u{1F1F1}\u{1F1FB}", name: "Latvia" },
  { code: "LB", flag: "\u{1F1F1}\u{1F1E7}", name: "Lebanon" },
  { code: "LS", flag: "\u{1F1F1}\u{1F1F8}", name: "Lesotho" },
  { code: "LR", flag: "\u{1F1F1}\u{1F1F7}", name: "Liberia" },
  { code: "LY", flag: "\u{1F1F1}\u{1F1FE}", name: "Libya" },
  { code: "LI", flag: "\u{1F1F1}\u{1F1EE}", name: "Liechtenstein" },
  { code: "LT", flag: "\u{1F1F1}\u{1F1F9}", name: "Lithuania" },
  { code: "LU", flag: "\u{1F1F1}\u{1F1FA}", name: "Luxembourg" },
  { code: "MG", flag: "\u{1F1F2}\u{1F1EC}", name: "Madagascar" },
  { code: "MW", flag: "\u{1F1F2}\u{1F1FC}", name: "Malawi" },
  { code: "MY", flag: "\u{1F1F2}\u{1F1FE}", name: "Malaysia" },
  { code: "MV", flag: "\u{1F1F2}\u{1F1FB}", name: "Maldives" },
  { code: "ML", flag: "\u{1F1F2}\u{1F1F1}", name: "Mali" },
  { code: "MT", flag: "\u{1F1F2}\u{1F1F9}", name: "Malta" },
  { code: "MH", flag: "\u{1F1F2}\u{1F1ED}", name: "Marshall Islands" },
  { code: "MR", flag: "\u{1F1F2}\u{1F1F7}", name: "Mauritania" },
  { code: "MU", flag: "\u{1F1F2}\u{1F1FA}", name: "Mauritius" },
  { code: "MX", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico" },
  { code: "FM", flag: "\u{1F1EB}\u{1F1F2}", name: "Micronesia" },
  { code: "MD", flag: "\u{1F1F2}\u{1F1E9}", name: "Moldova" },
  { code: "MC", flag: "\u{1F1F2}\u{1F1E8}", name: "Monaco" },
  { code: "MN", flag: "\u{1F1F2}\u{1F1F3}", name: "Mongolia" },
  { code: "ME", flag: "\u{1F1F2}\u{1F1EA}", name: "Montenegro" },
  { code: "MA", flag: "\u{1F1F2}\u{1F1E6}", name: "Morocco" },
  { code: "MZ", flag: "\u{1F1F2}\u{1F1FF}", name: "Mozambique" },
  { code: "MM", flag: "\u{1F1F2}\u{1F1F2}", name: "Myanmar" },
  { code: "NA", flag: "\u{1F1F3}\u{1F1E6}", name: "Namibia" },
  { code: "NR", flag: "\u{1F1F3}\u{1F1F7}", name: "Nauru" },
  { code: "NP", flag: "\u{1F1F3}\u{1F1F5}", name: "Nepal" },
  { code: "NL", flag: "\u{1F1F3}\u{1F1F1}", name: "Netherlands" },
  { code: "NZ", flag: "\u{1F1F3}\u{1F1FF}", name: "New Zealand" },
  { code: "NI", flag: "\u{1F1F3}\u{1F1EE}", name: "Nicaragua" },
  { code: "NE", flag: "\u{1F1F3}\u{1F1EA}", name: "Niger" },
  { code: "NG", flag: "\u{1F1F3}\u{1F1EC}", name: "Nigeria" },
  { code: "MK", flag: "\u{1F1F2}\u{1F1F0}", name: "North Macedonia" },
  { code: "NO", flag: "\u{1F1F3}\u{1F1F4}", name: "Norway" },
  { code: "OM", flag: "\u{1F1F4}\u{1F1F2}", name: "Oman" },
  { code: "PK", flag: "\u{1F1F5}\u{1F1F0}", name: "Pakistan" },
  { code: "PW", flag: "\u{1F1F5}\u{1F1FC}", name: "Palau" },
  { code: "PS", flag: "\u{1F1F5}\u{1F1F8}", name: "Palestine" },
  { code: "PA", flag: "\u{1F1F5}\u{1F1E6}", name: "Panama" },
  { code: "PG", flag: "\u{1F1F5}\u{1F1EC}", name: "Papua New Guinea" },
  { code: "PY", flag: "\u{1F1F5}\u{1F1FE}", name: "Paraguay" },
  { code: "PE", flag: "\u{1F1F5}\u{1F1EA}", name: "Peru" },
  { code: "PH", flag: "\u{1F1F5}\u{1F1ED}", name: "Philippines" },
  { code: "PL", flag: "\u{1F1F5}\u{1F1F1}", name: "Poland" },
  { code: "PT", flag: "\u{1F1F5}\u{1F1F9}", name: "Portugal" },
  { code: "QA", flag: "\u{1F1F6}\u{1F1E6}", name: "Qatar" },
  { code: "RO", flag: "\u{1F1F7}\u{1F1F4}", name: "Romania" },
  { code: "RU", flag: "\u{1F1F7}\u{1F1FA}", name: "Russia" },
  { code: "RW", flag: "\u{1F1F7}\u{1F1FC}", name: "Rwanda" },
  { code: "KN", flag: "\u{1F1F0}\u{1F1F3}", name: "Saint Kitts and Nevis" },
  { code: "LC", flag: "\u{1F1F1}\u{1F1E8}", name: "Saint Lucia" },
  { code: "VC", flag: "\u{1F1FB}\u{1F1E8}", name: "Saint Vincent and the Grenadines" },
  { code: "WS", flag: "\u{1F1FC}\u{1F1F8}", name: "Samoa" },
  { code: "SM", flag: "\u{1F1F8}\u{1F1F2}", name: "San Marino" },
  { code: "ST", flag: "\u{1F1F8}\u{1F1F9}", name: "S\u00e3o Tom\u00e9 and Pr\u00edncipe" },
  { code: "SA", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Arabia" },
  { code: "SN", flag: "\u{1F1F8}\u{1F1F3}", name: "Senegal" },
  { code: "RS", flag: "\u{1F1F7}\u{1F1F8}", name: "Serbia" },
  { code: "SC", flag: "\u{1F1F8}\u{1F1E8}", name: "Seychelles" },
  { code: "SL", flag: "\u{1F1F8}\u{1F1F1}", name: "Sierra Leone" },
  { code: "SG", flag: "\u{1F1F8}\u{1F1EC}", name: "Singapore" },
  { code: "SK", flag: "\u{1F1F8}\u{1F1F0}", name: "Slovakia" },
  { code: "SI", flag: "\u{1F1F8}\u{1F1EE}", name: "Slovenia" },
  { code: "SB", flag: "\u{1F1F8}\u{1F1E7}", name: "Solomon Islands" },
  { code: "SO", flag: "\u{1F1F8}\u{1F1F4}", name: "Somalia" },
  { code: "ZA", flag: "\u{1F1FF}\u{1F1E6}", name: "South Africa" },
  { code: "SS", flag: "\u{1F1F8}\u{1F1F8}", name: "South Sudan" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}", name: "Spain" },
  { code: "LK", flag: "\u{1F1F1}\u{1F1F0}", name: "Sri Lanka" },
  { code: "SD", flag: "\u{1F1F8}\u{1F1E9}", name: "Sudan" },
  { code: "SR", flag: "\u{1F1F8}\u{1F1F7}", name: "Suriname" },
  { code: "SE", flag: "\u{1F1F8}\u{1F1EA}", name: "Sweden" },
  { code: "CH", flag: "\u{1F1E8}\u{1F1ED}", name: "Switzerland" },
  { code: "SY", flag: "\u{1F1F8}\u{1F1FE}", name: "Syria" },
  { code: "TW", flag: "\u{1F1F9}\u{1F1FC}", name: "Taiwan" },
  { code: "TJ", flag: "\u{1F1F9}\u{1F1EF}", name: "Tajikistan" },
  { code: "TZ", flag: "\u{1F1F9}\u{1F1FF}", name: "Tanzania" },
  { code: "TH", flag: "\u{1F1F9}\u{1F1ED}", name: "Thailand" },
  { code: "TL", flag: "\u{1F1F9}\u{1F1F1}", name: "Timor-Leste" },
  { code: "TG", flag: "\u{1F1F9}\u{1F1EC}", name: "Togo" },
  { code: "TO", flag: "\u{1F1F9}\u{1F1F4}", name: "Tonga" },
  { code: "TT", flag: "\u{1F1F9}\u{1F1F9}", name: "Trinidad and Tobago" },
  { code: "TN", flag: "\u{1F1F9}\u{1F1F3}", name: "Tunisia" },
  { code: "TR", flag: "\u{1F1F9}\u{1F1F7}", name: "Turkey" },
  { code: "TM", flag: "\u{1F1F9}\u{1F1F2}", name: "Turkmenistan" },
  { code: "TV", flag: "\u{1F1F9}\u{1F1FB}", name: "Tuvalu" },
  { code: "UG", flag: "\u{1F1FA}\u{1F1EC}", name: "Uganda" },
  { code: "UA", flag: "\u{1F1FA}\u{1F1E6}", name: "Ukraine" },
  { code: "AE", flag: "\u{1F1E6}\u{1F1EA}", name: "United Arab Emirates" },
  { code: "GB", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom" },
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}", name: "United States" },
  { code: "UY", flag: "\u{1F1FA}\u{1F1FE}", name: "Uruguay" },
  { code: "UZ", flag: "\u{1F1FA}\u{1F1FF}", name: "Uzbekistan" },
  { code: "VU", flag: "\u{1F1FB}\u{1F1FA}", name: "Vanuatu" },
  { code: "VA", flag: "\u{1F1FB}\u{1F1E6}", name: "Vatican City" },
  { code: "VE", flag: "\u{1F1FB}\u{1F1EA}", name: "Venezuela" },
  { code: "VN", flag: "\u{1F1FB}\u{1F1F3}", name: "Vietnam" },
  { code: "YE", flag: "\u{1F1FE}\u{1F1EA}", name: "Yemen" },
  { code: "ZM", flag: "\u{1F1FF}\u{1F1F2}", name: "Zambia" },
  { code: "ZW", flag: "\u{1F1FF}\u{1F1FC}", name: "Zimbabwe" },
];

interface CountrySelectionStepProps {
  onContinue: () => void;
  onSelect: (country: string) => void;
  selected: string | null;
}

export const CountrySelectionStep = ({
  onContinue,
  onSelect,
  selected,
}: CountrySelectionStepProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base: Country[] = search.trim()
      ? COUNTRIES.filter((c) => {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q)
          );
        })
      : [...COUNTRIES];
    return base.sort((a, b) => {
      const sa = SUPPORTED_CODES.has(a.code) ? 0 : 1;
      const sb = SUPPORTED_CODES.has(b.code) ? 0 : 1;
      return sa - sb;
    });
  }, [search]);

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        description="Select your country to personalize your experience."
        title="Where are you based?"
      />
      <div className="relative">
        <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          className="bg-background pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries..."
          type="search"
          value={search}
        />
      </div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No countries match your search.
          </p>
        )}
        {filtered.map((country) => {
          const supported = SUPPORTED_CODES.has(country.code);
          const isSelected = selected === country.code;
          return (
            <button
              key={country.code}
              type="button"
              disabled={!supported}
              onClick={() => onSelect(country.code)}
              className={cn(
                "flex w-full items-center gap-3 border px-4 py-3 text-left text-sm transition-colors",
                supported
                  ? isSelected
                    ? "border-primary bg-secondary text-foreground"
                    : "border-border bg-card hover:border-primary hover:bg-muted text-foreground"
                  : "border-border bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <span className="text-xl">{country.flag}</span>
              <span className="font-medium">{country.name}</span>
              {!supported && (
                <span className="text-muted-foreground ml-auto text-xs">
                  Not supported yet
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Want to add support for your country?{" "}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          Contribute here
        </a>
      </p>
      <div className="flex justify-end">
        <Button disabled={!selected} onClick={onContinue} size="lg" type="button">
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};
