import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { INPUT_VERSION } from "./features";
import { loadModel, predict, unloadModel } from "./model";

const WEIGHTS_PATH = path.resolve(
  import.meta.dirname,
  "../../data/model-weights.json"
);

const writeOneCategoryWeightsThatFireOnAnything = async (
  inputVersion: number
): Promise<void> => {
  await mkdir(path.dirname(WEIGHTS_PATH), { recursive: true });
  await writeFile(
    WEIGHTS_PATH,
    JSON.stringify({
      categories: ["rent"],
      dimension: 65_536,
      inputVersion,
      weights: [{ "0": 0 }],
    }),
    "utf-8"
  );
};

describe("model", () => {
  afterEach(async () => {
    unloadModel();
    await rm(WEIGHTS_PATH, { force: true });
  });

  it("loadModel does not throw", async () => {
    await loadModel();
  });

  it("predict returns null with no weights file", async () => {
    const result = await predict("carrefour market", "FR");

    expect(result).toBeNull();
  });

  it("unloadModel does not throw", () => {
    unloadModel();
  });

  it("loads weights trained on the current input representation", async () => {
    await writeOneCategoryWeightsThatFireOnAnything(INPUT_VERSION);
    await loadModel();

    expect(await predict("carrefour market", "FR")).not.toBeNull();
  });

  it("refuses weights trained on an older input representation", async () => {
    await writeOneCategoryWeightsThatFireOnAnything(INPUT_VERSION - 1);
    await loadModel();

    expect(await predict("carrefour market", "FR")).toBeNull();
  });
});
