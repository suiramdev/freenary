import { describe, expect, it } from "bun:test";

import { SYNC_RUN_ABANDONED_AFTER_MS, syncProgressFrom } from "./sync-progress";
import type { SyncRunRow } from "./sync-progress";

const NOW = new Date("2026-09-20T10:00:00.000Z");

const row = (overrides: Partial<SyncRunRow>): SyncRunRow => ({
  accountsDone: 1,
  accountsTotal: 3,
  categorised: 0,
  categorisedTotal: 0,
  phase: "IMPORTING",
  startedAt: new Date(NOW.getTime() - 20_000),
  transactionsImported: 42,
  updatedAt: new Date(NOW.getTime() - 500),
  ...overrides,
});

describe("syncProgressFrom", () => {
  it("reports a live import with its counters", () => {
    expect(syncProgressFrom(row({}), NOW)).toEqual({
      accountsDone: 1,
      accountsTotal: 3,
      categorised: 0,
      categorisedTotal: 0,
      phase: "importing",
      startedAt: new Date(NOW.getTime() - 20_000),
      transactionsImported: 42,
    });
  });

  it("reports the categorising phase in the client's vocabulary", () => {
    const progress = syncProgressFrom(
      row({ categorised: 7, categorisedTotal: 42, phase: "CATEGORISING" }),
      NOW
    );

    expect(progress).toMatchObject({
      categorised: 7,
      categorisedTotal: 42,
      phase: "categorising",
    });
  });

  it("reports nothing when no run was ever recorded", () => {
    expect(syncProgressFrom(null, NOW)).toBeNull();
  });

  it("reports nothing once the run finished", () => {
    expect(syncProgressFrom(row({ phase: "FINISHED" }), NOW)).toBeNull();
  });

  it("keeps reporting a run that wrote just inside the abandon window", () => {
    const updatedAt = new Date(
      NOW.getTime() - SYNC_RUN_ABANDONED_AFTER_MS + 1000
    );

    expect(syncProgressFrom(row({ updatedAt }), NOW)).not.toBeNull();
  });

  it("abandons a run whose process stopped writing", () => {
    const updatedAt = new Date(NOW.getTime() - SYNC_RUN_ABANDONED_AFTER_MS);

    expect(syncProgressFrom(row({ updatedAt }), NOW)).toBeNull();
  });
});
