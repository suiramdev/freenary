const WORD = /\S+/gu;
const WHITESPACE_RUN = /\s+/gu;
const LOWERCASE_LETTER = /\p{Ll}/u;
const UPPERCASE_LETTER = /\p{Lu}/u;
const DIGIT = /\d/u;

interface MerchantSources {
  counterpartyName: string | null;
  description: string;
  normalisedDescriptor: string | null;
}

const capitalised = (word: string): string =>
  DIGIT.test(word)
    ? word
    : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;

export const readableName = (raw: string): string => {
  const collapsed = raw.trim().replaceAll(WHITESPACE_RUN, " ");
  const hasMixedCase =
    LOWERCASE_LETTER.test(collapsed) && UPPERCASE_LETTER.test(collapsed);

  return hasMixedCase ? collapsed : collapsed.replaceAll(WORD, capitalised);
};

export const merchantName = ({
  counterpartyName,
  description,
  normalisedDescriptor,
}: MerchantSources): string => {
  const source = [counterpartyName, normalisedDescriptor, description].find(
    (candidate) => candidate !== null && candidate.trim() !== ""
  );

  return readableName(source ?? description);
};
