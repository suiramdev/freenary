#!/usr/bin/env bun
import { cp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { gitConfig, repoBlobUrl } from "../src/lib/shared";
import {
  compareVersionIds,
  NEXT_VERSION,
  releaseFolder,
} from "../src/lib/versions";

type NavMeta = {
  pages?: string[];
  title?: string;
};

const CONTENT_DIR = "content/docs";
const STAGING_DIR_OUTSIDE_DOCS = "content/.snapshot";
const VERSION_LIST_FILE = "meta.json";
const PAGE_EXTENSION = ".mdx";

const exists = async (path: string) => {
  const parent = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const entries = await readdir(parent, { withFileTypes: true });

  return entries.some((entry) => entry.name === name);
};

/* SAFETY: no field of the parsed value is ever read here — `title` and `pages`
   are overwritten and every other key is re-serialised untouched — so the whole
   invariant is that a nav file holds a JSON object, which `JSON.parse` checks. */
const readNavMeta = async (path: string): Promise<NavMeta> =>
  JSON.parse(await readFile(path, "utf8")) as NavMeta;

const writeNavMeta = async (path: string, meta: NavMeta) => {
  await writeFile(path, `${JSON.stringify(meta, null, 2)}\n`);
};

const mdxFilesUnder = async (dir: string): Promise<string[]> => {
  const found: string[] = [];

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      found.push(...(await mdxFilesUnder(path)));
    } else if (entry.name.endsWith(PAGE_EXTENSION)) {
      found.push(path);
    }
  }

  return found;
};

const pinRepoLinksToTag = async (dir: string, tag: string) => {
  const movingBranchLinkTarget = `](${repoBlobUrl(gitConfig.branch)}`;
  const releaseTagLinkTarget = `](${repoBlobUrl(tag)}`;

  for (const page of await mdxFilesUnder(dir)) {
    const raw = await readFile(page, "utf8");

    if (raw.includes(movingBranchLinkTarget)) {
      await writeFile(
        page,
        raw.replaceAll(movingBranchLinkTarget, releaseTagLinkTarget)
      );
    }
  }
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

  await rm(STAGING_DIR_OUTSIDE_DOCS, { force: true, recursive: true });
  await cp(authored, STAGING_DIR_OUTSIDE_DOCS, { recursive: true });
  await pinRepoLinksToTag(STAGING_DIR_OUTSIDE_DOCS, `v${version}`);

  const stagedVersionList = join(STAGING_DIR_OUTSIDE_DOCS, VERSION_LIST_FILE);
  const stagedMeta = await readNavMeta(stagedVersionList);
  stagedMeta.title = folder;
  await writeNavMeta(stagedVersionList, stagedMeta);

  await rename(STAGING_DIR_OUTSIDE_DOCS, target);
  console.log(`Wrote ${target}, with repository links pinned to v${version}.`);
}

const folders = (await readdir(CONTENT_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort(compareVersionIds);

const versionList = join(CONTENT_DIR, VERSION_LIST_FILE);
const root = await readNavMeta(versionList);
root.pages = folders;
await writeNavMeta(versionList, root);

console.log(`Versions: ${folders.join(", ")}.`);
