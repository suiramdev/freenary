const DIACRITICS = /\p{Diacritic}/gu;

export const foldForSearch = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
