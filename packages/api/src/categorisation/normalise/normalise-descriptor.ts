/**
 * Canonical descriptor normalisation — the shared key for every categorisation stage.
 *
 * The same function normalises bank descriptors AND merchant-dictionary names, so the
 * memo table, the trigram index and the dictionary artifact all agree on one spelling.
 * Divergence here silently breaks matching, so this module has no dependencies and no
 * institution-specific behaviour.
 *
 * Normalisation is applied on write and the result is stored, because Postgres
 * `unaccent()` is STABLE rather than IMMUTABLE and therefore cannot appear in an
 * expression index.
 */

/**
 * Channel verbs, card markers and legal forms carry no merchant identity.
 * Dropping them raises trigram similarity between a descriptor and a merchant name.
 */
const NOISE_TOKENS = {
  ab: true,
  achat: true,
  ag: true,
  aps: true,
  as: true,
  au: true,
  aux: true,
  avoir: true,
  bv: true,
  card: true,
  carte: true,
  cb: true,
  cheque: true,
  chq: true,
  co: true,
  contactless: true,
  credit: true,
  dab: true,
  de: true,
  debit: true,
  des: true,
  direct: true,
  du: true,
  ech: true,
  ei: true,
  eirl: true,
  et: true,
  eurl: true,
  facture: true,
  gie: true,
  gmbh: true,
  inc: true,
  inst: true,
  kg: true,
  la: true,
  le: true,
  les: true,
  llc: true,
  ltd: true,
  mandat: true,
  mdt: true,
  mob: true,
  nv: true,
  ohg: true,
  operation: true,
  oy: true,
  paiement: true,
  par: true,
  payment: true,
  payweb: true,
  plc: true,
  prelevement: true,
  pret: true,
  prlv: true,
  psc: true,
  purchase: true,
  ref: true,
  reference: true,
  remise: true,
  retrait: true,
  sa: true,
  sarl: true,
  sas: true,
  sasu: true,
  sci: true,
  scop: true,
  sepa: true,
  snc: true,
  spa: true,
  srl: true,
  transfer: true,
  uab: true,
  un: true,
  une: true,
  vir: true,
  virement: true,
  withdrawal: true,
} as const satisfies Record<string, true>;

const COMBINING_MARKS = /[\u0300-\u036F]/gu;
/**
 * Apostrophes are removed rather than treated as separators: banks print
 * "MCDONALDS", so splitting "McDonald's" into "mcdonald s" would never match.
 */
const APOSTROPHES = /['\u2019\u02BC`]/gu;
const NON_ALPHANUMERIC = /[^a-z0-9]+/gu;
const CONTAINS_DIGIT = /[0-9]/u;

/**
 * Splits text into identity-bearing lowercase tokens.
 *
 * Digit-bearing tokens are dropped: they are store numbers, terminal ids, dates and
 * card suffixes, never merchant identity.
 */
export const normaliseTokens = (text: string): string[] => {
  const folded = text
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "oe")
    .replaceAll("æ", "ae")
    .replaceAll("Æ", "ae")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(NON_ALPHANUMERIC, " ");

  const tokens: string[] = [];
  for (const token of folded.split(" ")) {
    if (token.length === 0) {
      continue;
    }
    if (CONTAINS_DIGIT.test(token)) {
      continue;
    }
    // SAFETY: token is an arbitrary string; the assertion only narrows for the const lookup
    if (NOISE_TOKENS[token as keyof typeof NOISE_TOKENS] === true) {
      continue;
    }
    tokens.push(token);
  }
  return tokens;
};

/**
 * The canonical normalised form: identity-bearing tokens joined by single spaces.
 * Returns an empty string when the input carries no identity at all.
 */
export const normaliseDescriptor = (text: string): string =>
  normaliseTokens(text).join(" ");
