#!/usr/bin/env bun
/**
 * Freezes the authored documentation as a released version.
 *
 *   bun run docs:snapshot 1.2.0
 *
 * `content/docs/next` is copied to `content/docs/1.2`, the copy is labelled
 * `1.2`, and the root `meta.json` gains it. An authored docs link carries no
 * version, so it resolves inside whichever folder serves it; a repository link
 * names `main`, so the copy pins each one to the release tag.
 *
 * The `Release` workflow runs this before it tags, in a checkout with no
 * `node_modules`. Every import here therefore resolves to a source file or a
 * node built-in, never to a package.
 */

import { cp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { gitConfig, repoBlobUrl } from "../src/lib/shared";
import {
  compareVersionIds,
  NEXT_VERSION,
  releaseFolder,
} from "../src/lib/versions";

const CONTENT_DIR = "content/docs";
const STAGING_DIR = "content/.snapshot";

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

/** Every `.mdx` file under a directory, at any depth. */
const pagesUnder = async (dir: string): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await pagesUnder(path)));
    } else if (entry.name.endsWith(".mdx")) {
      found.push(path);
    }
  }
  return found;
};

const version = process.argv[2];
const folder = version ? releaseFolder(version) : undefined;

if (!folder) {
  console.error(
    `Not a release version: ${version ?? "(none)"} (expected X.Y.Z, such as 1.2.0)`
  );
  process.exit(1);
}

const target = join(CONTENT_DIR, folder);
const authored = join(CONTENT_DIR, NEXT_VERSION);

if (await exists(target)) {
  console.log(`${target} exists; leaving its pages alone.`);
} else {
  if (!(await exists(authored))) {
    console.error(`${authored} is missing: there is nothing to snapshot.`);
    process.exit(1);
  }

  // The copy is staged outside `content/docs` and moved in one step, so an
  // interrupted run leaves no half-written version for the site to serve or for
  // a retry to mistake for a finished snapshot.
  await rm(STAGING_DIR, { force: true, recursive: true });
  await cp(authored, STAGING_DIR, { recursive: true });

  // A link target alone. The same prefix appears in prose, where the authoring
  // page names the branch on purpose.
  const moving = `](${repoBlobUrl(gitConfig.branch)}`;
  const pinned = `](${repoBlobUrl(`v${version}`)}`;
  for (const page of await pagesUnder(STAGING_DIR)) {
    const raw = await readFile(page, "utf8");
    if (raw.includes(moving)) {
      await writeFile(page, raw.replaceAll(moving, pinned));
    }
  }

  const meta = await readJson(join(STAGING_DIR, "meta.json"));
  meta.title = folder;
  await writeJson(join(STAGING_DIR, "meta.json"), meta);

  await rename(STAGING_DIR, target);
  console.log(`Wrote ${target}, with repository links pinned to v${version}.`);
}

// Always rewritten, never skipped: a run that copied the folder and stopped
// before this left the release out of the version list, and the retry has to
// finish the job rather than report success.
const folders = (await readdir(CONTENT_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort(compareVersionIds);

const root = await readJson(join(CONTENT_DIR, "meta.json"));
root.pages = folders;
await writeJson(join(CONTENT_DIR, "meta.json"), root);

console.log(`Versions: ${folders.join(", ")}.`);
