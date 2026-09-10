import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

import { docsRoute } from "./shared";
import { compareVersionIds, isVersionId, NEXT_VERSION } from "./versions";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
    // The default schema needs `title` only. A page with no description renders
    // an empty subtitle and no search summary, so the build refuses that too.
    // An icon belongs to a section separator in the version's `meta.json`,
    // never to a page: `ALLOWED_FRONTMATTER_KEYS` in `scripts/docs-rules.ts`
    // rejects one here.
    schema: pageSchema.extend({
      description: z.string().min(1),
    }),
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

let versions: string[] | undefined;

/** Every version folder the loader found, newest release first. */
export const listVersions = (): string[] => {
  versions ??= [...new Set(source.getPages().map((page) => page.slugs[0]))]
    .filter(isVersionId)
    .sort(compareVersionIds);
  return versions;
};

/** The newest release, or `next` while no release exists. */
export const stableVersion = (): string =>
  listVersions().find((id) => id !== NEXT_VERSION) ?? NEXT_VERSION;

/**
 * The page-tree folder that holds one version. Its `name` is the version: the
 * `version` rule in `scripts/check-docs.ts` pins each `meta.json` title to its
 * folder name.
 */
export const versionNode = (version: string) =>
  source
    .getPageTree()
    .children.find(
      (child) => child.type === "folder" && child.name === version
    );

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");
  // Authored links carry no version, so a frozen page's Markdown would send a
  // reader through the redirect and back to the newest release.
  const versioned = processed.replace(
    /(\]\(|href=")\/docs\//g,
    `$1${docsRoute}/${page.slugs[0]}/`
  );

  return `# ${page.data.title} (${page.url})

${versioned}`;
}
