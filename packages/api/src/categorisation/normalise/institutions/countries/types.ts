import type { SupportedCountry } from "../../../supported-countries";
import type { TransactionChannel } from "../../types";
import type { InstitutionDef } from "../definitions";

export type ChannelVerbPattern = readonly [
  verbPrefix: RegExp,
  channel: TransactionChannel,
];

export interface CountryProfile {
  readonly code: SupportedCountry;
  readonly institutions: readonly InstitutionDef[];
  readonly channelVerbsLongestFirst: readonly ChannelVerbPattern[];
  readonly trailingNoiseInStripOrder: readonly RegExp[];
}
