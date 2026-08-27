import type { IntermediaryDefinition } from "./types";

export const INTERMEDIARY_CATALOGUE = {
  adyen: {
    carriesSubmerchant: false,
    creditorIdentifiers: ["NL48ZZZ342764500000"],
    id: "adyen",
    markers: ["adyen"],
    name: "Adyen",
  },
  checkout: {
    carriesSubmerchant: true,
    id: "checkout",
    markers: ["cko"],
    name: "Checkout.com",
  },
  klarna: {
    carriesSubmerchant: false,
    id: "klarna",
    markers: ["klarna"],
    name: "Klarna",
  },
  lydia: {
    carriesSubmerchant: false,
    id: "lydia",
    markers: ["lydia"],
    name: "Lydia",
  },
  mollie: {
    carriesSubmerchant: true,
    creditorIdentifiers: ["NL08ZZZ502057730000"],
    id: "mollie",
    markers: ["mollie"],
    name: "Mollie",
  },
  nexi: {
    carriesSubmerchant: false,
    id: "nexi",
    markers: ["nexi"],
    name: "Nexi",
  },
  paypal: {
    carriesSubmerchant: true,
    id: "paypal",
    markers: ["paypal", "pp"],
    name: "PayPal",
  },
  revolut: {
    carriesSubmerchant: false,
    id: "revolut",
    markers: ["revolut"],
    name: "Revolut",
  },
  shopify: {
    carriesSubmerchant: false,
    id: "shopify",
    markers: ["shopify"],
    name: "Shopify",
  },
  square: {
    carriesSubmerchant: true,
    id: "square",
    markers: ["sq"],
    name: "Square",
  },
  stripe: {
    carriesSubmerchant: false,
    id: "stripe",
    markers: ["stripe"],
    name: "Stripe",
  },
  sumup: {
    carriesSubmerchant: true,
    id: "sumup",
    markers: ["sumup"],
    name: "SumUp",
  },
  tfl: {
    carriesSubmerchant: true,
    id: "tfl",
    markers: ["tml"],
    name: "Transport for London",
  },
  worldline: {
    carriesSubmerchant: false,
    id: "worldline",
    markers: ["worldline", "ingenico"],
    name: "Worldline",
  },
  zettle: {
    carriesSubmerchant: true,
    id: "zettle",
    markers: ["ztl", "iz", "izettle", "zettle"],
    name: "Zettle",
  },
} as const satisfies Record<string, IntermediaryDefinition>;

/**
 * Intermediaries whose prefix convention is scheme-documented,
 * so a marker match alone warrants high confidence.
 */
export const HIGH_CONFIDENCE_MARKER_IDS = {
  checkout: true,
  mollie: true,
  paypal: true,
  square: true,
  sumup: true,
  tfl: true,
  zettle: true,
} as const satisfies Record<string, true>;

/** O(1) marker → intermediary id lookup, built once at module scope. */
export const MARKER_INDEX: Record<string, string> = {};

for (const def of Object.values(INTERMEDIARY_CATALOGUE)) {
  for (const marker of def.markers) {
    MARKER_INDEX[marker] = def.id;
  }
}

/** O(1) IBAN → intermediary id lookup, built once at module scope. */
export const IBAN_INDEX: Record<string, string> = {};

for (const def of Object.values(INTERMEDIARY_CATALOGUE)) {
  if (def.ibans) {
    for (const iban of def.ibans) {
      IBAN_INDEX[iban] = def.id;
    }
  }
}
