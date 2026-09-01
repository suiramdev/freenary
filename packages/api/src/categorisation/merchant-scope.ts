/**
 * The `countries` contract for a dictionary merchant, in one place.
 *
 * An empty `countries` means worldwide — a brand every country needs — not
 * "belongs nowhere". That makes worldwide the widest scope there is, so it
 * absorbs any narrower one on merge and survives every filter.
 */

/**
 * Combines the scopes of merchants being merged into one row. Worldwide wins: a
 * row that answers for the whole world cannot be narrowed by a sibling that
 * only claims a few countries.
 *
 * Pass only scopes a source actually stated. An absent claim — Wikidata with no
 * P17, say — must be omitted rather than passed as `[]`, because `[]` here
 * asserts worldwide and would erase every sibling's real scope.
 */
export const mergeCountryScopes = (
  scopes: Iterable<readonly string[]>
): string[] => {
  const merged = new Set<string>();

  for (const scope of scopes) {
    if (scope.length === 0) {
      return [];
    }
    for (const country of scope) {
      merged.add(country);
    }
  }

  return [...merged].toSorted();
};

/**
 * Whether a merchant should load for a batch covering `wanted`. Passing `null`
 * wants every country.
 */
export const isInCountryScope = (
  countries: readonly string[] | undefined,
  wanted: ReadonlySet<string> | null
): boolean => {
  if (wanted === null) {
    return true;
  }
  const scope = countries ?? [];
  return scope.length === 0 || scope.some((country) => wanted.has(country));
};
