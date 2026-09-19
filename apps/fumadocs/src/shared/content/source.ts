import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

import { docsRoute } from "../config/site";
import { compareVersionIds, isVersionId, NEXT_VERSION } from "../lib/versions";

const UNVERSIONED_DOCS_LINK = /(\]\(|href=")\/docs\//g;

const pageWithDescriptionAndIcon = pageSchema.extend({
  description: z.string().min(1),
  icon: z.string().min(1),
});

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: pageWithDescriptionAndIcon,
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

const once = <T>(compute: () => T) => {
  let computed: T | undefined;

  return (): T => (computed ??= compute());
};

export const listVersions = once((): string[] =>
  [...new Set(source.getPages().map((page) => page.slugs[0]))]
    .filter(isVersionId)
    .sort(compareVersionIds)
);

export const newestRelease = (): string =>
  listVersions().find((id) => id !== NEXT_VERSION) ?? NEXT_VERSION;

export const versionNode = (version: string) =>
  source
    .getPageTree()
    .children.find(
      (child) => child.type === "folder" && child.name === version
    );

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");
  const versioned = processed.replace(
    UNVERSIONED_DOCS_LINK,
    `$1${docsRoute}/${page.slugs[0]}/`
  );

  return `# ${page.data.title} (${page.url})

${versioned}`;
}
