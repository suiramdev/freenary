/**
 * Reads `content/docs` into the shape `check-docs.ts` needs: the page tree, the
 * frontmatter, the headings, the links, the code fences, and the prose with
 * everything that is not prose masked out.
 *
 * Masking keeps every newline, so a byte offset in the masked text still maps to
 * the line it came from.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Glob } from "bun";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const FRONTMATTER_LINE = /^([A-Za-z][\w-]*):\s*(.*)$/;
const CODE_FENCE = /^([ \t]*)(`{3,}|~{3,})([^\n]*)\n[\s\S]*?^\1\2[ \t]*$/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const JSX_TAG = /<\/?[A-Za-z][\w.]*(?:\s[^>]*?)?\/?>/g;
const JSX_EXPRESSION = /\{\{[\s\S]*?\}\}/g;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;
const EXPLICIT_HEADING_ID = /\s*(?:\[#([\w-]+)\]|\{#([\w-]+)\})\s*$/;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
const HREF_ATTRIBUTE = /href=(?:"([^"]*)"|\{`([^`]*)`\})/g;
const HEADING_MARKUP = /`|\*\*|__|\[([^\]]*)\]\([^)]*\)/g;
const NON_SLUG = /[^\da-z\s-]/g;
const SLUG_SPACE = /\s+/g;

export type CodeFence = {
  readonly language: string;
  readonly index: number;
};

export type DocLink = {
  readonly target: string;
  readonly index: number;
};

export type DocPage = {
  /** Absolute path on disk. */
  readonly file: string;
  /** Path relative to the content directory, for example `guides/budget.mdx`. */
  readonly rel: string;
  /** The folder the page sits in, `""` for the content root. */
  readonly folder: string;
  /** The site URL, for example `/docs/guides/budget`. */
  readonly url: string;
  readonly raw: string;
  readonly frontmatter: Record<string, string>;
  /** Frontmatter keys in the order they appear, with their line numbers. */
  readonly frontmatterLines: Record<string, number>;
  /** Anchor ids of every heading on the page. */
  readonly anchors: Record<string, true>;
  readonly headings: ReadonlyArray<{ text: string; index: number }>;
  readonly fences: readonly CodeFence[];
  readonly components: ReadonlyArray<{ name: string; index: number }>;
  readonly links: readonly DocLink[];
  /** The body with code, JSX and frontmatter masked to spaces. */
  readonly prose: string;
};

export type MetaFile = {
  readonly file: string;
  readonly folder: string;
  readonly pages: readonly string[];
  readonly raw: string;
};

export const lineAt = (text: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
    }
  }
  return line;
};

/** Replaces a range with spaces and keeps its newlines, so offsets stay true. */
const blank = (text: string): string => text.replace(/[^\n]/g, " ");

const maskPattern = (text: string, pattern: RegExp): string => {
  pattern.lastIndex = 0;
  return text.replace(pattern, blank);
};

/**
 * Inline code is one word to a reader, and a sentence can open with it. Spaces
 * would hide both facts, so it becomes an opaque capitalised token of the same
 * length instead.
 */
const codeToken = (text: string): string => text.replace(/[^\n]/g, "X");

export const slugify = (heading: string): string =>
  heading
    .replace(
      HEADING_MARKUP,
      (_match, linkText: string | undefined) => linkText ?? ""
    )
    .trim()
    .toLowerCase()
    .replace(NON_SLUG, "")
    .replace(SLUG_SPACE, "-");

const parseFrontmatter = (
  raw: string
): {
  frontmatter: Record<string, string>;
  frontmatterLines: Record<string, number>;
} => {
  const frontmatter: Record<string, string> = {};
  const frontmatterLines: Record<string, number> = {};
  const block = FRONTMATTER.exec(raw);
  if (!block) {
    return { frontmatter, frontmatterLines };
  }

  const lines = block[1].split("\n");
  for (const [offset, line] of lines.entries()) {
    const entry = FRONTMATTER_LINE.exec(line);
    if (!entry) {
      continue;
    }
    const value = entry[2].trim().replace(/^["']|["']$/g, "");
    frontmatter[entry[1]] = value;
    frontmatterLines[entry[1]] = offset + 2;
  }

  return { frontmatter, frontmatterLines };
};

const collectHeadings = (raw: string) => {
  const headings: Array<{ text: string; index: number }> = [];
  const anchors: Record<string, true> = {};
  HEADING.lastIndex = 0;
  let match = HEADING.exec(raw);
  while (match) {
    const explicit = EXPLICIT_HEADING_ID.exec(match[2]);
    const text = explicit
      ? match[2].slice(0, explicit.index).trim()
      : match[2].trim();
    headings.push({ text, index: match.index });
    anchors[explicit ? (explicit[1] ?? explicit[2]) : slugify(text)] = true;
    match = HEADING.exec(raw);
  }
  return { headings, anchors };
};

const collectMatches = (
  raw: string,
  pattern: RegExp,
  pick: (match: RegExpExecArray) => string | undefined
) => {
  const found: Array<{ value: string; index: number }> = [];
  pattern.lastIndex = 0;
  let match = pattern.exec(raw);
  while (match) {
    const value = pick(match);
    if (value !== undefined) {
      found.push({ value, index: match.index });
    }
    match = pattern.exec(raw);
  }
  return found;
};

const collectFences = (raw: string): CodeFence[] =>
  collectMatches(
    raw,
    CODE_FENCE,
    (match) => match[3].trim().split(/\s+/)[0]
  ).map(({ value, index }) => ({ language: value, index }));

const OPENING_TAG_NAME = /^<([A-Z][\w.]*)/;

/** Opening tags only: a closing tag names the same component twice. */
const collectComponents = (raw: string) => {
  const masked = maskPattern(maskPattern(raw, CODE_FENCE), INLINE_CODE);
  return collectMatches(
    masked,
    JSX_TAG,
    (match) => OPENING_TAG_NAME.exec(match[0])?.[1]
  ).map(({ value, index }) => ({ name: value, index }));
};

const collectLinks = (raw: string): DocLink[] => {
  const masked = maskPattern(maskPattern(raw, CODE_FENCE), INLINE_CODE);
  const markdown = collectMatches(masked, MARKDOWN_LINK, (match) => match[1]);
  const attributes = collectMatches(
    masked,
    HREF_ATTRIBUTE,
    (match) => match[1] ?? match[2]
  );
  return [...markdown, ...attributes].map(({ value, index }) => ({
    target: value,
    index,
  }));
};

/** Masks frontmatter, code, JSX tags and JSX expressions. What is left is prose. */
const extractProse = (raw: string): string => {
  const withoutFrontmatter = raw.replace(FRONTMATTER, blank);
  const withoutCode = maskPattern(withoutFrontmatter, CODE_FENCE);
  INLINE_CODE.lastIndex = 0;
  const withoutInline = withoutCode.replace(INLINE_CODE, codeToken);
  const withoutExpressions = maskPattern(withoutInline, JSX_EXPRESSION);
  return maskPattern(withoutExpressions, JSX_TAG);
};

const urlFor = (rel: string, baseRoute: string): string => {
  const withoutExtension = rel.replace(/\.mdx$/, "");
  const slug = withoutExtension.replace(/(^|\/)index$/, "");
  return slug === "" ? baseRoute : `${baseRoute}/${slug}`;
};

export const readPages = async (
  contentDir: string,
  baseRoute: string
): Promise<DocPage[]> => {
  const glob = new Glob("**/*.mdx");
  const files: string[] = [];
  for await (const found of glob.scan({ cwd: contentDir })) {
    files.push(found);
  }
  files.sort();

  const pages: DocPage[] = [];
  for (const rel of files) {
    const file = join(contentDir, rel);
    const raw = await readFile(file, "utf8");
    const { frontmatter, frontmatterLines } = parseFrontmatter(raw);
    const { headings, anchors } = collectHeadings(maskPattern(raw, CODE_FENCE));
    const folder = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";

    pages.push({
      anchors,
      components: collectComponents(raw),
      fences: collectFences(raw),
      file,
      folder,
      frontmatter,
      frontmatterLines,
      headings,
      links: collectLinks(raw),
      prose: extractProse(raw),
      raw,
      rel,
      url: urlFor(rel, baseRoute),
    });
  }
  return pages;
};

export const readMetaFiles = async (
  contentDir: string
): Promise<MetaFile[]> => {
  const glob = new Glob("**/meta.json");
  const files: string[] = [];
  for await (const found of glob.scan({ cwd: contentDir })) {
    files.push(found);
  }
  files.sort();

  const metas: MetaFile[] = [];
  for (const rel of files) {
    const file = join(contentDir, rel);
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as { pages?: string[] };
    metas.push({
      file,
      folder: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "",
      pages: parsed.pages ?? [],
      raw,
    });
  }
  return metas;
};
