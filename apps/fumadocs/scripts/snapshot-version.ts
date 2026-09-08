#!/usr/bin/env bun
/**
 * Freezes the authored documentation as a released version.
 *
 *   bun run docs:snapshot 1.2
 *
 * `content/docs/next` is copied to `content/docs/1.2`, the copy is labelled
 * `1.2`, and the root `meta.json` gains it. Pages need no edit: an authored
 * link carries no version, so it resolves inside whichever folder serves it.
 *
 * The `Release` workflow runs this before it tags, in a checkout with no
 * `node_modules`. Every import here therefore resolves to a source file or a
 * node built-in, never to a package.
 */

import { cp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  compareVersionIds,
  isReleaseId,
  NEXT_VERSION,
} from "../src/lib/versions";

const CONTENT_DIR = "content/docs";

const exists = async (path: string) => {
  const parent = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const entries = await readdir(parent, { withFileTypes: true });
  return entries.some((entry) => entry.name === name);
};

const readJson = async (path: string) =>
  JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;

const writeJson = async (path: string, value: Record<string, unknown>) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const version = process.argv[2];

if (!version || !isReleaseId(version)) {
  console.error(
    `Not a documentation version: ${version ?? "(none)"} (expected X.Y, such as 1.2)`
  );
  process.exit(1);
}

const target = join(CONTENT_DIR, version);

if (await exists(target)) {
  console.log(`${target} exists; nothing to snapshot.`);
  process.exit(0);
}

const authored = join(CONTENT_DIR, NEXT_VERSION);

if (!(await exists(authored))) {
  console.error(`${authored} is missing: there is nothing to snapshot.`);
  process.exit(1);
}

await cp(authored, target, { recursive: true });

const meta = await readJson(join(target, "meta.json"));
meta.title = version;
await writeJson(join(target, "meta.json"), meta);

const folders = (await readdir(CONTENT_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort(compareVersionIds);

const root = await readJson(join(CONTENT_DIR, "meta.json"));
root.pages = folders;
await writeJson(join(CONTENT_DIR, "meta.json"), root);

console.log(`Wrote ${target}.`);
console.log(`Versions: ${folders.join(", ")}.`);
