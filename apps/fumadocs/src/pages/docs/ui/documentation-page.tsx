import { Link } from "@tanstack/react-router";
import { cn } from "cn";
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

import { baseOptions, gitConfig } from "@/shared/config";
import { docs } from "@/shared/content";
import { NEXT_VERSION } from "@/shared/lib/versions";
import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/shared/ui/ai-search";
import { useMDXComponents } from "@/shared/ui/mdx";

import type { LoadedDoc, NewestReleaseLink } from "../api/load-doc";

const VersionNotice = ({
  version,
  newer,
}: {
  version: string;
  newer: NewestReleaseLink;
}) => (
  <Callout type="warn">
    {version === NEXT_VERSION
      ? `This page describes the unreleased code. Version ${newer.version} is the newest release.`
      : `This page describes version ${version}. Version ${newer.version} is the newest release.`}{" "}
    <Link to="/docs/$" params={{ _splat: newer.splat }}>
      {newer.samePage
        ? `Read this page for ${newer.version}`
        : `This page is gone in ${newer.version}; read its documentation`}
    </Link>
    .
  </Callout>
);

function Content({
  path,
  markdownUrl,
  version,
  newer,
}: {
  path: string;
  markdownUrl: string;
  version: string;
  newer: NewestReleaseLink | null;
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

export function DocumentationPage({ loaded }: { loaded: LoadedDoc }) {
  const { path, pageTree, markdownUrl, version, newer } =
    useFumadocsLoader(loaded);

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
