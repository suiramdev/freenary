import { describe, expect, it } from "bun:test";

import { loadModel, predict, unloadModel } from "./model";

describe("model stub", () => {
  it("loadModel does not throw", async () => {
    await loadModel();
  });

  it("predict returns null (stub)", async () => {
    const result = await predict("carrefour market", "FR");
    expect(result).toBeNull();
  });

  it("unloadModel does not throw", () => {
    unloadModel();
  });
});
