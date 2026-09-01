/**
 * Token-boundary wrapper for the keyword tables.
 *
 * `\b` is ASCII-only, so a leading `\b` before "överföring" or "impôt" can
 * never fire. These lookarounds are letter/number aware, which is what the
 * tables need: they are matched against whole descriptors, where an
 * unanchored "ica" or "bolt" would hit "medical" or "boltons".
 */

/** Compile an alternation into a pattern that only matches whole tokens. */
export const tokens = (alternation: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, "u");
