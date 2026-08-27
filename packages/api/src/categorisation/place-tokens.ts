/**
 * Place-name tokens that carry location, not merchant identity.
 *
 * Card descriptors routinely append the acceptor's city ("MONOPRIX PARIS 15"),
 * which creates two distinct failure modes this list defends against:
 *
 *  1. A dictionary entry whose whole name is a place ("París", a Spanish department
 *     store) is unique in the canon, so its IDF is maximal and it would *pass* the
 *     specificity gate on a shared city token.
 *  2. A city token shared between descriptor and candidate must never be the
 *     evidence that satisfies the gate.
 *
 * Tokens are stored already normalised (see `normaliseDescriptor`): accent-folded,
 * lowercase, single words. Multi-word places are matched token-wise by the consumer.
 */
const PLACE_TOKENS = {
  aix: true,
  ajaccio: true,
  amiens: true,
  amsterdam: true,
  angers: true,
  annecy: true,
  antibes: true,
  antwerpen: true,
  argenteuil: true,
  athens: true,
  avignon: true,
  barcelona: true,
  bayonne: true,
  belgique: true,
  berlin: true,
  besancon: true,
  beziers: true,
  bordeaux: true,
  boulogne: true,
  bourges: true,
  brest: true,
  brussels: true,
  bruxelles: true,
  budapest: true,
  caen: true,
  calais: true,
  cannes: true,
  cergy: true,
  chambery: true,
  cholet: true,
  clermont: true,
  colmar: true,
  copenhagen: true,
  courbevoie: true,
  creteil: true,
  deutschland: true,
  dijon: true,
  dublin: true,
  dunkerque: true,
  dusseldorf: true,
  espana: true,
  france: true,
  frankfurt: true,
  geneve: true,
  grenoble: true,
  hamburg: true,
  helsinki: true,
  hyeres: true,
  issy: true,
  italia: true,
  koln: true,
  laval: true,
  lille: true,
  limoges: true,
  lisboa: true,
  lisbon: true,
  london: true,
  lorient: true,
  luxembourg: true,
  lyon: true,
  madrid: true,
  mans: true,
  marseille: true,
  metz: true,
  milano: true,
  montauban: true,
  montpellier: true,
  montreuil: true,
  mulhouse: true,
  munchen: true,
  nancy: true,
  nanterre: true,
  nantes: true,
  napoli: true,
  nederland: true,
  nice: true,
  nimes: true,
  niort: true,
  orleans: true,
  oslo: true,
  paris: true,
  pau: true,
  perpignan: true,
  poitiers: true,
  porto: true,
  praha: true,
  quimper: true,
  reims: true,
  rennes: true,
  roma: true,
  rotterdam: true,
  roubaix: true,
  rouen: true,
  saint: true,
  sainte: true,
  sevilla: true,
  stockholm: true,
  strasbourg: true,
  suisse: true,
  torino: true,
  toulon: true,
  toulouse: true,
  tourcoing: true,
  tours: true,
  troyes: true,
  valence: true,
  valencia: true,
  vannes: true,
  versailles: true,
  vienna: true,
  villeurbanne: true,
  vitry: true,
  warszawa: true,
  wien: true,
  zurich: true,
} as const satisfies Record<string, true>;

/** True when a normalised token names a place rather than a merchant. */
export const isPlaceToken = (token: string): boolean =>
  // SAFETY: token is an arbitrary string; the assertion only narrows for the const lookup
  PLACE_TOKENS[token as keyof typeof PLACE_TOKENS] === true;

/**
 * True when every token of a normalised name is a place token, so the name
 * carries no merchant identity at all.
 */
export const isEntirelyPlaceName = (normalisedName: string): boolean => {
  const tokens = normalisedName.split(" ").filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every(isPlaceToken);
};
