import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../../data/place-tokens.json"
);

let placeTokenSet: Set<string> | null = null;

const ensureLoaded = (): Set<string> => {
  if (placeTokenSet === null) {
    if (existsSync(DATA_PATH)) {
      // SAFETY: the file is a JSON array of strings written by the build script
      const tokens = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as string[];
      placeTokenSet = new Set(tokens);
    } else {
      placeTokenSet = new Set();
    }
  }
  return placeTokenSet;
};

/** Check if a normalised token is a known place name. */
export const isPlaceToken = (token: string): boolean =>
  ensureLoaded().has(token);

/** Get the full set of place tokens (for the build pipeline). */
export const getPlaceTokens = (): ReadonlySet<string> => ensureLoaded();
