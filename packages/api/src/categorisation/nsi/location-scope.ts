/**
 * Resolves the Name Suggestion Index geographic scope of a brand to ISO 3166-1
 * alpha-2 countries.
 *
 * NSI's `locationSet.include` is a mixed bag: ISO country codes, ISO 3166-2
 * subdivisions, UN M49 region codes, its own region filenames, inline GeoJSON
 * geometry, and a handful of codes that are not ISO at all.
 */

/** `us-hi`, `gb-eng` — an ISO 3166-2 subdivision names its country in the prefix. */
const NSI_SUBDIVISION = /^(?<cc>[a-z]{2})-[a-z0-9]{2,3}$/u;

/** `fr-ara.geojson` — NSI's region files are country-prefixed the same way. */
const NSI_GEOJSON_REGION = /^(?<cc>[a-z]{2})-[a-z0-9]+\.geojson$/u;

/** A bare country code. Two letters only — `Intl.DisplayNames.of` rejects the rest. */
const ALPHA2 = /^[a-z]{2}$/u;

/**
 * NSI's own non-ISO spelling of a country. Only `fx` (metropolitan France) is
 * folded: it carries more French brands than `fr` itself, so dropping it would
 * leave the French scope at a third of its real size. The others NSI uses —
 * `el` for Greece, `ra` for Argentina, `pi` for the Philippines, `kv` for
 * Kosovo — are left to fail validation, and `ja` must fail: it means Japan in
 * some entries and Jamaica in others, so folding it would invent a fact.
 */
const NSI_METROPOLITAN_FRANCE = "fx";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** True only for a real ISO 3166-1 region; `of` echoes back codes it knows nothing about. */
const isIsoRegion = (code: string): boolean => regionNames.of(code) !== code;

/**
 * Values naming no single country — UN M49 codes (`001` world, `150` Europe),
 * inline GeoJSON geometry, free-text regions (`conus`) — yield nothing. An
 * empty result means the brand is unscoped, which is different from being
 * scoped nowhere: a worldwide brand belongs to every country.
 */
export const resolveNsiCountries = (include?: readonly unknown[]): string[] => {
  const countries = new Set<string>();

  for (const value of include ?? []) {
    // Non-string members are inline GeoJSON geometry, which stringifies to
    // something no shape below accepts.
    const token = String(value).toLowerCase();
    const subdivision =
      NSI_SUBDIVISION.exec(token) ?? NSI_GEOJSON_REGION.exec(token);
    const code = subdivision?.groups?.["cc"] ?? token;

    if (code === NSI_METROPOLITAN_FRANCE) {
      countries.add("FR");
      continue;
    }

    // `of` throws RangeError on anything that is not a well-formed region
    // subtag, so only two letters may reach it.
    if (!ALPHA2.test(code)) {
      continue;
    }
    const upper = code.toUpperCase();
    if (isIsoRegion(upper)) {
      countries.add(upper);
    }
  }

  return [...countries].toSorted();
};
