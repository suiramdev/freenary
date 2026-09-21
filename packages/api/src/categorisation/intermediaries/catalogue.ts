import type { CataloguedIntermediary, IntermediaryDefinition } from "./types";

export const INTERMEDIARY_CATALOGUE = {
  adyen: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Adyen",
    normalisedLeadingTokenMarkers: ["adyen"],
    sepaCreditorIdentifiers: ["NL48ZZZ342764500000"],
  },
  checkout: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "Checkout.com",
    normalisedLeadingTokenMarkers: ["cko"],
  },
  klarna: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Klarna",
    normalisedLeadingTokenMarkers: ["klarna"],
  },
  lydia: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Lydia",
    normalisedLeadingTokenMarkers: ["lydia"],
  },
  mollie: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "Mollie",
    normalisedLeadingTokenMarkers: ["mollie"],
    sepaCreditorIdentifiers: ["NL08ZZZ502057730000"],
  },
  nexi: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Nexi",
    normalisedLeadingTokenMarkers: ["nexi"],
  },
  paypal: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "PayPal",
    normalisedLeadingTokenMarkers: ["paypal", "pp"],
  },
  revolut: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Revolut",
    normalisedLeadingTokenMarkers: ["revolut"],
  },
  shopify: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Shopify",
    normalisedLeadingTokenMarkers: ["shopify"],
  },
  square: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "Square",
    normalisedLeadingTokenMarkers: ["sq"],
  },
  stripe: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Stripe",
    normalisedLeadingTokenMarkers: ["stripe"],
  },
  sumup: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "SumUp",
    normalisedLeadingTokenMarkers: ["sumup"],
  },
  tfl: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "Transport for London",
    normalisedLeadingTokenMarkers: ["tfl"],
  },
  worldline: {
    carriesSubmerchant: false,
    hasSchemeDocumentedPrefix: false,
    name: "Worldline",
    normalisedLeadingTokenMarkers: ["worldline", "ingenico"],
  },
  zettle: {
    carriesSubmerchant: true,
    hasSchemeDocumentedPrefix: true,
    name: "Zettle",
    normalisedLeadingTokenMarkers: ["ztl", "iz", "izettle", "zettle"],
  },
} satisfies Record<string, IntermediaryDefinition>;

export const BY_LEADING_MARKER: Record<
  string,
  CataloguedIntermediary | undefined
> = {};

export const BY_CREDITOR_IBAN: Record<
  string,
  CataloguedIntermediary | undefined
> = {};

export const BY_SEPA_CREDITOR_IDENTIFIER: Record<
  string,
  CataloguedIntermediary | undefined
> = {};

export const intermediaryFor = (
  table: Record<string, CataloguedIntermediary | undefined>,
  key: string
): CataloguedIntermediary | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;

for (const [id, definition] of Object.entries<IntermediaryDefinition>(
  INTERMEDIARY_CATALOGUE
)) {
  const catalogued: CataloguedIntermediary = { definition, id };

  for (const marker of definition.normalisedLeadingTokenMarkers) {
    BY_LEADING_MARKER[marker] = catalogued;
  }

  for (const iban of definition.creditorIbans ?? []) {
    BY_CREDITOR_IBAN[iban] = catalogued;
  }

  for (const identifier of definition.sepaCreditorIdentifiers ?? []) {
    BY_SEPA_CREDITOR_IDENTIFIER[identifier] = catalogued;
  }
}
