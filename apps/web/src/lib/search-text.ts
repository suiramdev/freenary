const DIACRITICS = /\p{Diacritic}/gu;

/**
 * Case- and accent-insensitive form for substring search. Translated lists are
 * full of accents a keyboard does not reach for — "bresil" has to find "Brésil"
 * and "energie" has to find "Énergie".
 */
export const foldForSearch = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
