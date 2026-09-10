/**
 * The rule data for `check-docs.ts`.
 *
 * Every entry restates a rule that `AGENTS.md` already states in prose and that
 * `vite build` does not catch. Keep the two in step.
 */

/**
 * Frontmatter keys a page may carry. Anything else is a mistake, `icon`
 * included: an icon marks a section in its `meta.json`, never a page.
 */
export const ALLOWED_FRONTMATTER_KEYS: Record<string, true> = {
  description: true,
  full: true,
  title: true,
};

/** Shiki language ids this site uses. An id outside the set fails the build. */
export const ALLOWED_CODE_LANGUAGES: Record<string, true> = {
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
};

/**
 * Languages that mark a page as operator or contributor material. A guide tells
 * a reader what to do in the interface, so none of these belong in `guides/`.
 */
export const SHELL_CODE_LANGUAGES: Record<string, true> = {
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
};

/** Words the ASD-STE100 dictionary replaces. Each maps to its approved term. */
export const WORD_SUBSTITUTIONS: ReadonlyArray<readonly [RegExp, string]> = [
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

/** Modal verbs ASD-STE100 forbids, with the approved replacement. */
export const BANNED_MODALS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bshall\b/gi, "must"],
  [/\bshould\b/gi, "must, or drop the modal"],
  [/\bmay\b/gi, "can"],
  [/\bmight\b/gi, "can"],
  [/\bought to\b/gi, "must"],
];

/** Roadmap language. A page states what the code does now, and nothing else. */
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

/**
 * ASD-STE100 allows no contraction. A possessive `'s` is not one, so the `'s`
 * branch names only the words that contract with it.
 */
export const CONTRACTION =
  /\b(?:\w+(?:n['’]t|['’](?:re|ve|ll|d|m))|(?:it|that|there|here|what|who|let|he|she|one)['’]s)\b/gi;

/** An environment variable or an enum value: operator and contributor material. */
export const SCREAMING_SNAKE = /\b[A-Z][A-Z\d]*(?:_[A-Z\d]+)+\b/g;

/** Sentence limits. ASD-STE100: 20 words for an instruction, 25 for a description. */
export const MAX_SENTENCE_WORDS = 25;
export const WARN_SENTENCE_WORDS = 20;

/** ASD-STE100 allows 6 sentences in one paragraph. */
export const MAX_PARAGRAPH_SENTENCES = 6;
