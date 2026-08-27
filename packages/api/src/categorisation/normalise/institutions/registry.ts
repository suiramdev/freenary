import type { InstitutionParser } from "../types";
import { bnpParibas } from "./bnp-paribas";
import { boursorama } from "./boursorama";
import { creditAgricole } from "./credit-agricole";
import { creditMutuel } from "./credit-mutuel";
import { laBanquePostale } from "./la-banque-postale";
import { lcl } from "./lcl";
import { societeGenerale } from "./societe-generale";

/**
 * Ordered list of institution-specific parsers.
 * The generic parser is NOT in this list — it is the fallback when nothing matches.
 */
export const institutionParsers: readonly InstitutionParser[] = [
  boursorama,
  bnpParibas,
  creditAgricole,
  societeGenerale,
  creditMutuel,
  lcl,
  laBanquePostale,
];

export { generic } from "./generic";
