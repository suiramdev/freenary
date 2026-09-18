import type { InstitutionParser } from "../types";
import { allInstitutions } from "./countries";
import {
  GENERIC_PARSER_ID,
  matchesInstitution,
  parseWithInstitution,
} from "./parse-engine";

export const institutionParsers: readonly InstitutionParser[] =
  allInstitutions.map((def) => ({
    id: def.id,
    matches: (input) => matchesInstitution(input, def),
    parse: (input) => parseWithInstitution(input, def),
  }));

export const genericParser: InstitutionParser = {
  id: GENERIC_PARSER_ID,
  matches: () => true,
  parse: (input) => parseWithInstitution(input, null),
};
