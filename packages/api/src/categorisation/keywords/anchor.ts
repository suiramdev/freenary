const NOT_PRECEDED_BY_LETTER_OR_DIGIT = "(?<![\\p{L}\\p{N}])";
const NOT_FOLLOWED_BY_LETTER_OR_DIGIT = "(?![\\p{L}\\p{N}])";

export const wholeTokenPattern = (alternation: string): RegExp =>
  new RegExp(
    `${NOT_PRECEDED_BY_LETTER_OR_DIGIT}(?:${alternation})${NOT_FOLLOWED_BY_LETTER_OR_DIGIT}`,
    "u"
  );
