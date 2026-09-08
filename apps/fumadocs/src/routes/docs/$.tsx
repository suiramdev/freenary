import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Callout } from "fumadocs-ui/components/callout";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { MessageCircleIcon } from "lucide-react";
import { Suspense, use } from "react";

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search";
import { useMDXComponents } from "@/components/mdx";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";
import { docsRoute, encodeMarkdownUrl, gitConfig } from "@/lib/shared";
import { docs, source, stableVersion } from "@/lib/source";
import { NEXT_VERSION } from "@/lib/versions";

/** The newest release, when the page being read is not part of it. */
type Newer = { version: string; splat: string };

const VersionNotice = ({
  version,
  newer,
}: {
  version: string;
  newer: Newer;
}) => (
  <Callout type="warn">
    {version === NEXT_VERSION
      ? `This page describes the unreleased code. Version ${newer.version} is the newest release.`
      : `This page describes version ${version}. Version ${newer.version} is the newest release.`}{" "}
    <Link to="/docs/$" params={{ _splat: newer.splat }}>
      Read this page for {newer.version}
    </Link>
    .
  </Callout>
);

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? [];
    const data = await serverLoader({ data: slugs });
    await docs.getPage(data.path)?.preload();
    return data;
  },
});

const serverLoader = createServerFn({
  method: "GET",
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const version = page.slugs[0];
    const stable = stableVersion();

    return {
      path: page.path,
      markdownUrl: encodeMarkdownUrl(page.slugs, page.locale),
      pageTree: await source.serializePageTree(source.getPageTree()),
      version,
      // The same page in the newest release, or its index when it is gone.
      newer:
        version === stable
          ? null
          : {
              version: stable,
              splat: (
                source.getPage([stable, ...page.slugs.slice(1)])?.url ??
                `${docsRoute}/${stable}`
              ).slice(docsRoute.length + 1),
            },
    };
  });

function Content({
  path,
  markdownUrl,
  version,
  newer,
}: {
  path: string;
  markdownUrl: string;
  version: string;
  newer: Newer | null;
}) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/fumadocs/content/docs/${path}`}
        />
      </div>
      <DocsBody>
        {newer && <VersionNotice version={version} newer={newer} />}
        <MDX components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

function Page() {
  const { path, pageTree, markdownUrl, version, newer } = useFumadocsLoader(
    Route.useLoaderData()
  );

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <AISearch version={version}>
        <AISearchPanel />
        <AISearchTrigger
          position="float"
          className={cn(
            buttonVariants({
              variant: "secondary",
              className: "text-fd-muted-foreground rounded-2xl",
            })
          )}
        >
          <MessageCircleIcon className="size-4.5" />
          Ask AI
        </AISearchTrigger>
      </AISearch>

      <Suspense>
        <Content
          path={path}
          markdownUrl={markdownUrl}
          version={version}
          newer={newer}
        />
      </Suspense>
    </DocsLayout>
  );
}
