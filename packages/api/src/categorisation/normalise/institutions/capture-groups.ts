/**
 * Named regex capture groups are the contract between country profiles,
 * which author the patterns, and the parse engine, which reads them back.
 * This module owns that read so neither side has to import the other.
 */

/**
 * Read a named capture group, returning the trimmed value or undefined when
 * the group is absent or blank.
 */
export const capture = (
  groups: Record<string, string>,
  name: string
): string | undefined => {
  const val = groups[name]?.trim();
  return val && val.length > 0 ? val : undefined;
};
