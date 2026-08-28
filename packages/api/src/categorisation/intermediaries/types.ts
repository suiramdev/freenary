export type IntermediaryConfidence = "high" | "medium";

export interface IntermediaryDefinition {
  /** Stable slug, e.g. "sumup". Used as the Intermediary.id in the database. */
  id: string;
  /** Display name, e.g. "SumUp". */
  name: string;
  /**
   * Normalised leading tokens that mark this intermediary, matched against
   * normaliseDescriptor output. e.g. ["sumup"], ["paypal"], ["sq"], ["ztl"].
   */
  markers: readonly string[];
  /** True when the descriptor reliably carries the sub-merchant after the marker. */
  carriesSubmerchant: boolean;
  /** Creditor IBANs known to belong to this intermediary. */
  ibans?: readonly string[];
  /** SEPA creditor identifiers known to belong to this intermediary. */
  creditorIdentifiers?: readonly string[];
}

export interface IntermediaryMatch {
  intermediaryId: string;
  intermediaryName: string;
  /** Text after the marker, null when this intermediary does not expose it. */
  submerchantText: string | null;
  /** normaliseDescriptor(submerchantText); empty string when submerchantText is null. */
  normalisedSubmerchant: string;
  confidence: IntermediaryConfidence;
  /** How the match was made. */
  matchedBy: "marker" | "iban" | "creditor-identifier";
}

export interface DetectIntermediaryInput {
  /** Output of normaliseDescriptor for the descriptor under test. */
  normalisedDescriptor: string;
  /** The raw descriptor text, used only for asterisk-position corroboration. */
  rawDescriptor: string;
  creditorIban?: string | null;
  creditorIdentifications?: readonly { identification: string }[] | null;
}
