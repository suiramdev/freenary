import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

import {
  loadDictionary,
  lookupDictionary,
  unloadDictionary,
} from "./dictionary";

/**
 * The artifact path itself is what these tests guard: the loader resolved one
 * directory above the package's own `data/` for a while and silently found
 * nothing, turning every stage-3 lookup into a miss with only a warning.
 */
const DATA_PATH = path.resolve(
  import.meta.dirname,
  "../../data/merchants.jsonl.gz"
);
const BACKUP_PATH = `${DATA_PATH}.test-backup`;

const merchantLine = (id: string, name: string, countries?: string[]): string =>
  JSON.stringify({
    aliases: [
      {
        alias: `${name} Store`,
        normalisedAlias: `${name.toLowerCase()} store`,
      },
    ],
    category: "groceries",
    countries,
    domains: [],
    id,
    name,
    normalisedName: name.toLowerCase(),
    source: "curated",
  });

const writeFixture = async (): Promise<void> => {
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  const lines = [
    merchantLine("test/zz", "Testmart", ["ZZ"]),
    merchantLine("test/global", "Worldmart"),
  ];
  await writeFile(DATA_PATH, gzipSync(`${lines.join("\n")}\n`));
};

describe("dictionary", () => {
  // The fixture has to occupy the real artifact path to prove the loader
  // resolves there, so move the build output aside for the duration.
  beforeAll(async () => {
    // A previous run died between the hooks: the real artifact is still in the
    // backup and a fixture sits at the real path. Put it back before swapping,
    // or the rename below would overwrite the only copy — it is gitignored, so
    // there would be nothing to restore from.
    if (existsSync(BACKUP_PATH)) {
      await rm(DATA_PATH, { force: true });
      await rename(BACKUP_PATH, DATA_PATH);
    }
    if (existsSync(DATA_PATH)) {
      await rename(DATA_PATH, BACKUP_PATH);
    }
  });

  afterAll(async () => {
    await rm(DATA_PATH, { force: true });
    if (existsSync(BACKUP_PATH)) {
      await rename(BACKUP_PATH, DATA_PATH);
    }
  });

  // lookupDictionary() populates the module cache without going through the
  // refCount protocol, so an earlier test file can leave the real artifact
  // resident and make these tests order-dependent.
  beforeEach(() => {
    unloadDictionary();
  });

  afterEach(() => {
    unloadDictionary();
  });

  it("loads the artifact from the package's own data directory", async () => {
    await writeFixture();
    await loadDictionary(["ZZ"]);

    expect(await lookupDictionary("testmart")).toEqual({
      category: "groceries",
      name: "Testmart",
    });
  });

  it("resolves aliases to the same entry", async () => {
    await writeFixture();
    await loadDictionary(["ZZ"]);

    expect(await lookupDictionary("testmart store")).toEqual({
      category: "groceries",
      name: "Testmart",
    });
  });

  it("returns null for a merchant the artifact does not carry", async () => {
    await writeFixture();
    await loadDictionary(["ZZ"]);

    expect(await lookupDictionary("no such merchant")).toBeNull();
  });

  it("drops merchants outside the requested country but keeps unscoped ones", async () => {
    await writeFixture();
    await loadDictionary(["FR"]);

    expect(await lookupDictionary("testmart")).toBeNull();
    expect(await lookupDictionary("worldmart")).toEqual({
      category: "groceries",
      name: "Worldmart",
    });
  });
});
