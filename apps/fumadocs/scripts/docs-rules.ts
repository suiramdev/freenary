type BannedPhrase = readonly [pattern: RegExp, approvedTerm: string];

const ALLOWED_FRONTMATTER_KEYS = {
  description: true,
  full: true,
  icon: true,
  title: true,
} satisfies Record<string, true>;

const ALLOWED_SHIKI_LANGUAGES = {
  bash: true,
  diff: true,
  dockerfile: true,
  dotenv: true,
  http: true,
  json: true,
  jsonc: true,
  md: true,
  mdx: true,
  prisma: true,
  sql: true,
  text: true,
  ts: true,
  tsx: true,
  yaml: true,
} satisfies Record<string, true>;

const OPERATOR_ONLY_CODE_LANGUAGES = {
  bash: true,
  diff: true,
  dockerfile: true,
  dotenv: true,
  http: true,
  json: true,
  jsonc: true,
  prisma: true,
  sql: true,
  ts: true,
  tsx: true,
  yaml: true,
} satisfies Record<string, true>;

const CONTRACTED_SUFFIX = /\w+(?:n['’]t|['’](?:re|ve|ll|d|m))/;

const WORDS_THAT_CONTRACT_WITH_S =
  /(?:it|that|there|here|what|who|let|he|she|one)['’]s/;

export const isAllowedFrontmatterKey = (key: string): boolean =>
  Object.hasOwn(ALLOWED_FRONTMATTER_KEYS, key);

export const isAllowedCodeLanguage = (language: string): boolean =>
  Object.hasOwn(ALLOWED_SHIKI_LANGUAGES, language);

export const isOperatorOnlyCodeLanguage = (language: string): boolean =>
  Object.hasOwn(OPERATOR_ONLY_CODE_LANGUAGES, language);

export const STE_WORD_SUBSTITUTIONS: readonly BannedPhrase[] = [
  [/\bhowever\b/gi, "but"],
  [/\balthough\b/gi, "but"],
  [/\bwhilst\b/gi, "but"],
  [/\bvia\b/gi, "with, or by"],
  [/\bprior to\b/gi, "before"],
  [/\bin order to\b/gi, "to"],
  [/\butilis[ez]e?\b/gi, "use"],
  [/\bperforms?\b/gi, "does"],
  [/\bprovides?\b/gi, "gives"],
  [/\brequires?\b/gi, "needs"],
  [/\bensures?\b/gi, "makes sure"],
  [/\bverif(?:y|ies)\b/gi, "check"],
  [/\bobtains?\b/gi, "gets"],
  [/\badditional\b/gi, "more"],
  [/\bmultiple\b/gi, "many"],
  [/\bapproximately\b/gi, "about"],
  [/\bidentical\b/gi, "the same"],
  [/\bsufficient\b/gi, "enough"],
  [/\boccurs?\b/gi, "happens"],
  [/\bindicates?\b/gi, "shows"],
  [/\bcurrently\b/gi, "now"],
  [/\bterminates?\b/gi, "stops"],
  [/\be\.g\.\b/gi, "for example"],
  [/\bi\.e\.\b/gi, "that is"],
  [/\betc\./gi, "the full list"],
  [/\bleverages?\b/gi, "uses"],
  [/\bfacilitates?\b/gi, "helps"],
  [/\bin terms of\b/gi, "for"],
  [/\bas well as\b/gi, "and"],
];

export const STE_BANNED_MODALS: readonly BannedPhrase[] = [
  [/\bshall\b/gi, "must"],
  [/\bshould\b/gi, "must, or drop the modal"],
  [/\bmay\b/gi, "can"],
  [/\bmight\b/gi, "can"],
  [/\bought to\b/gi, "must"],
];

export const ROADMAP_PHRASES: readonly RegExp[] = [
  /\bcoming soon\b/gi,
  /\broadmap\b/gi,
  /\bnot yet (?:built|implemented|available|supported)\b/gi,
  /\bin a (?:future|later) (?:release|version)\b/gi,
  /\bwe plan to\b/gi,
  /\bis planned\b/gi,
  /\bwill be (?:added|supported|available)\b/gi,
  /\bfor now\b/gi,
  /\bat this time\b/gi,
];

export const CONTRACTION = new RegExp(
  `\\b(?:${CONTRACTED_SUFFIX.source}|${WORDS_THAT_CONTRACT_WITH_S.source})\\b`,
  "gi"
);

export const ENV_VAR_OR_ENUM_NAME = /\b[A-Z][A-Z\d]*(?:_[A-Z\d]+)+\b/g;

export const STE_DESCRIPTION_WORD_LIMIT = 25;

export const STE_INSTRUCTION_WORD_LIMIT = 20;

export const STE_PARAGRAPH_SENTENCE_LIMIT = 6;
