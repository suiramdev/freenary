const WORLDWIDE: readonly string[] = [];

const isWorldwide = (scope: readonly string[]): boolean => scope.length === 0;

export const mergeCountryScopes = (
  scopes: Iterable<readonly string[]>
): string[] => {
  const merged = new Set<string>();

  for (const scope of scopes) {
    if (isWorldwide(scope)) {
      return [...WORLDWIDE];
    }

    for (const country of scope) {
      merged.add(country);
    }
  }

  return [...merged].toSorted();
};

export const isInCountryScope = (
  countries: readonly string[] | undefined,
  wanted: ReadonlySet<string> | null
): boolean => {
  const wantsEveryCountry = wanted === null;

  if (wantsEveryCountry) {
    return true;
  }

  const scope = countries ?? WORLDWIDE;

  return isWorldwide(scope) || scope.some((country) => wanted.has(country));
};
