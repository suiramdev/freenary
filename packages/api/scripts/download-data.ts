/**
 * Downloads the latest merchant data release from GitHub.
 *
 * Looks for the most recent release tagged `data-YYYY-MM-DD`, downloads its
 * `merchant-data.tar.gz` asset, and extracts the data files into
 * `packages/api/data/`.
 *
 * Exit codes:
 *   0 — data downloaded and extracted successfully
 *   1 — no release found or download failed (caller should fall back to
 *       local generation via `build:data:generate`)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const RELEASE_TAG_PREFIX = "data-";
const ASSET_NAME = "merchant-data.tar.gz";

const PACKAGE_DIR = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.resolve(PACKAGE_DIR, "data");
const EXPECTED_ARTIFACT = path.resolve(DATA_DIR, "merchants.jsonl.gz");

/**
 * Resolve the GitHub repository slug (`owner/repo`) from, in order:
 * 1. `GITHUB_REPOSITORY` env var (GitHub Actions, Docker build arg)
 * 2. git remote origin URL
 * 3. hardcoded fallback
 */
const resolveRepo = (): string => {
  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) {
    return envRepo;
  }

  try {
    const url = execSync("git remote get-url origin", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const match = url.match(
      /github\.com[:/](?<slug>[^/]+\/[^/]+?)(?:\.git)?$/u
    );
    const slug = match?.groups?.slug;
    if (slug) {
      return slug;
    }
  } catch {
    // git not available (e.g. inside Docker without .git)
  }

  return "suiramdev/freenary";
};

interface ReleaseAsset {
  name: string;
  url: string;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

const main = async (): Promise<void> => {
  const repo = resolveRepo();

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freenary-data-download",
    "X-GitHub-Api-Version": "2022-11-28",
  } satisfies Record<string, string>;

  const token = process.env.GITHUB_TOKEN;
  const headers = token
    ? { ...baseHeaders, Authorization: `Bearer ${token}` }
    : baseHeaders;

  // Find the latest data-* release
  console.log(`Looking for latest ${RELEASE_TAG_PREFIX}* release in ${repo}…`);
  const releasesUrl = `https://api.github.com/repos/${repo}/releases?per_page=20`;
  const releasesRes = await fetch(releasesUrl, { headers });

  if (!releasesRes.ok) {
    console.log(
      `GitHub API returned ${releasesRes.status} — no release available`
    );
    process.exit(1);
  }

  // SAFETY: the releases endpoint returned 2xx, checked above, so GitHub's
  // documented release list shape holds
  const releases = (await releasesRes.json()) as Release[];
  const release = releases.find((r) =>
    r.tag_name.startsWith(RELEASE_TAG_PREFIX)
  );

  if (!release) {
    console.log(`No ${RELEASE_TAG_PREFIX}* release found`);
    process.exit(1);
  }

  const asset = release.assets.find((a) => a.name === ASSET_NAME);

  if (!asset) {
    console.log(`Release ${release.tag_name} has no ${ASSET_NAME} asset`);
    process.exit(1);
  }

  // Download the tarball via the API asset endpoint (works for both public
  // and private repos when a token is provided).
  console.log(`Downloading ${ASSET_NAME} from ${release.tag_name}…`);
  const downloadRes = await fetch(asset.url, {
    headers: { ...headers, Accept: "application/octet-stream" },
    redirect: "follow",
  });

  if (!downloadRes.ok) {
    console.log(`Download failed with status ${downloadRes.status}`);
    process.exit(1);
  }

  const tarballBytes = new Uint8Array(await downloadRes.arrayBuffer());
  console.log(
    `Downloaded ${(tarballBytes.byteLength / 1024 / 1024).toFixed(1)} MB`
  );

  // Extract to packages/api/data/
  await mkdir(DATA_DIR, { recursive: true });
  const tmpPath = path.join(tmpdir(), `merchant-data-${Date.now()}.tar.gz`);

  try {
    await writeFile(tmpPath, tarballBytes);
    execSync(`tar -xzf ${tmpPath} -C ${PACKAGE_DIR}`, { stdio: "inherit" });
  } finally {
    await rm(tmpPath, { force: true });
  }

  // Verify the primary artifact landed
  if (!existsSync(EXPECTED_ARTIFACT)) {
    console.log(
      "Extraction completed but merchants.jsonl.gz is missing — tarball may be malformed"
    );
    process.exit(1);
  }

  console.log(`Using merchant data from release ${release.tag_name}`);
};

try {
  await main();
} catch (error) {
  console.log(
    `Data download failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}
