import { usePathname } from "fumadocs-core/framework";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Card } from "fumadocs-ui/components/card";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";

import { resolveDocsHref } from "@/lib/versions";

const BaseLink = defaultMdxComponents.a;

const VersionedLink = ({ href, ...props }: ComponentProps<typeof BaseLink>) => {
  const pathname = usePathname();

  return <BaseLink href={resolveDocsHref(href, pathname)} {...props} />;
};

const VersionedCard = ({ href, ...props }: ComponentProps<typeof Card>) => {
  const pathname = usePathname();

  return <Card href={resolveDocsHref(href, pathname)} {...props} />;
};

const extraMdxComponents = {
  a: VersionedLink,
  Accordion,
  Accordions,
  Card: VersionedCard,
  File,
  Files,
  Folder,
  Step,
  Steps,
  Tab,
  Tabs,
  TypeTable,
};

export const getMDXComponents = (
  components: MDXComponents = {}
): MDXComponents => ({
  ...defaultMdxComponents,
  ...extraMdxComponents,
  ...components,
});

export const useMDXComponents = getMDXComponents;

export type DocsMdxComponents = typeof defaultMdxComponents &
  typeof extraMdxComponents;

declare global {
  type MDXProvidedComponents = DocsMdxComponents;
}
