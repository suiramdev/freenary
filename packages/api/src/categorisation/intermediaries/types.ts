export type IntermediaryConfidence = "high" | "medium";

export type IntermediaryMatchedBy = "marker" | "iban" | "creditor-identifier";

export interface IntermediaryDefinition {
  name: string;
  normalisedLeadingTokenMarkers: readonly string[];
  carriesSubmerchant: boolean;
  hasSchemeDocumentedPrefix: boolean;
  creditorIbans?: readonly string[];
  sepaCreditorIdentifiers?: readonly string[];
}

export interface CataloguedIntermediary {
  readonly id: string;
  readonly definition: IntermediaryDefinition;
}

export interface IntermediaryMatch {
  intermediaryId: string;
  intermediaryName: string;
  submerchantText: string | null;
  normalisedSubmerchant: string;
  confidence: IntermediaryConfidence;
  matchedBy: IntermediaryMatchedBy;
}

export interface DetectIntermediaryInput {
  normalisedDescriptor: string;
  rawDescriptor: string;
  creditorIban?: string | null;
  creditorIdentifications?: readonly { identification: string }[] | null;
}
