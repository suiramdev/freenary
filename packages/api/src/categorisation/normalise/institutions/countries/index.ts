import { SUPPORTED_COUNTRIES } from "../../../supported-countries";
import type { SupportedCountry } from "../../../supported-countries";
import type { InstitutionDef } from "../definitions";
import { fr } from "./fr";
import type { ChannelVerbPattern, CountryProfile } from "./types";

const profilesByCountry = {
  FR: fr,
} satisfies Record<SupportedCountry, CountryProfile>;

const profilesInSupportOrder: readonly CountryProfile[] =
  SUPPORTED_COUNTRIES.map((code) => profilesByCountry[code]);

export const allInstitutions: readonly InstitutionDef[] =
  profilesInSupportOrder.flatMap((profile) => profile.institutions);

export const allChannelVerbsLongestFirst: readonly ChannelVerbPattern[] =
  profilesInSupportOrder.flatMap((profile) => profile.channelVerbsLongestFirst);

export const allTrailingNoiseInStripOrder: readonly RegExp[] =
  profilesInSupportOrder.flatMap(
    (profile) => profile.trailingNoiseInStripOrder
  );
