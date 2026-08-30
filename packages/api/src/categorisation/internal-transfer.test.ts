import { describe, expect, it } from "bun:test";

import { matchInternalTransfers } from "./internal-transfer";

describe("matchInternalTransfers", () => {
  it("returns 0 for non-existent user", async () => {
    const result = await matchInternalTransfers("nonexistent-user-id");
    expect(result).toBe(0);
  });

  it("never throws on empty input", async () => {
    const result = await matchInternalTransfers("");
    expect(result).toBe(0);
  });
});
