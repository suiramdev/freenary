#!/usr/bin/env bun
/**
 * The documentation gate.
 *
 * `vite build` catches a missing frontmatter title and an unknown code-fence
 * language. It catches nothing else: a wrong icon name, an unregistered
 * component, a dead internal link and a page missing from `meta.json` all ship
 * green. This script checks every rule the build leaves open, plus the
 * structure and the language rules in `AGENTS.md`.
 *
 *   bun run docs:check            errors fail, warnings print
 *   bun run docs:check --strict   warnings fail too
 *
 * The component list and the icon list come from the app itself, not from a
 * copy: `getMDXComponents()` and lucide's `icons` record are the same values
 * the site renders with.
 */

import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { icons } from "lucide-react";

import { getMDXComponents } from "../src/components/mdx";
import { isVersionId, NEXT_VERSION } from "../src/lib/versions";
import {
  type DocPage,
  lineAt,
  type MetaFile,
  readMetaFiles,
  readPages,
  slugify,
} from "./docs-model";
import {
  ALLOWED_CODE_LANGUAGES,
  ALLOWED_FRONTMATTER_KEYS,
  BANNED_MODALS,
  CONTRACTION,
  MAX_PARAGRAPH_SENTENCES,
  MAX_SENTENCE_WORDS,
  ROADMAP_PHRASES,
  SCREAMING_SNAKE,
  SHELL_CODE_LANGUAGES,
  WARN_SENTENCE_WORDS,
  WORD_SUBSTITUTIONS,
} from "./docs-rules";

const CONTENT_DIR = "content/docs";
const BASE_ROUTE = "/docs";
/** The version a page belongs to: `content/docs/<version>/…`. */
const versionOf = (rel: string) => rel.split("/")[0];
/** A file this site owns: a page, or a `meta.json`. */
const CONTENT_FILE = /\.(?:mdx|json)$/;
/** Entries a `meta.json` `pages` array accepts besides a page or folder name. */
const META_DIRECTIVE = /^(?:---.*---|\.\.\..*|!.+|(?:external:)?\[.*\]\(.*\))$/;
// A sentence can end inside markup (`… one line.**`) and the next one can open
// with a link or a bold run, so both sides tolerate the punctuation around them.
const SENTENCE_SPLIT = /(?<=[.!?][*_`")\]]{0,2})\s+(?=[*_`"'[(A-Z])/;
const PARAGRAPH_SPLIT = /\n[ \t]*\n/;
const TABLE_ROW = /^[ \t]*\|/;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+\.)\s/;
const WORD = /[\w'’-]+/g;
const ANCHOR_LINK = /^([^#]*)(?:#(.+))?$/;
// A page that writes `{/* docs-check disable: ste-word, no-roadmap */}` switches
// those rules off for itself. One page has to name the words the rules ban: the
// authoring page.
const IGNORE_DIRECTIVE = /docs-check disable:\s*([\w\s,-]+)/g;

type Severity = "error" | "warning";

type Finding = {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: Severity;
};

const findings: Finding[] = [];
/** Rules the page under test switched off. Reset for every page. */
let ignoredRules: Record<string, true> = {};

const report = (
  severity: Severity,
  file: string,
  line: number,
  rule: string,
  message: string
) => {
  if (ignoredRules[rule]) {
    return;
  }
  findings.push({ file, line, message, rule, severity });
};

// --- frontmatter -----------------------------------------------------------

const checkFrontmatter = (page: DocPage) => {
  const { frontmatter, frontmatterLines, rel } = page;

  for (const field of ["title", "description", "icon"]) {
    if (!frontmatter[field]) {
      report(
        "error",
        rel,
        1,
        "frontmatter",
        `no \`${field}\` in the frontmatter. Every page carries a title, a description and an icon.`
      );
    }
  }

  for (const key of Object.keys(frontmatter)) {
    if (!ALLOWED_FRONTMATTER_KEYS[key]) {
      report(
        "error",
        rel,
        frontmatterLines[key] ?? 1,
        "frontmatter",
        `\`${key}\` is not a frontmatter field. Use title, description, icon or full.`
      );
    }
  }

  const icon = frontmatter.icon;
  if (icon && !(icon in icons)) {
    report(
      "error",
      rel,
      frontmatterLines.icon ?? 1,
      "icon",
      `\`${icon}\` is not in lucide's \`icons\` record, so it renders nothing. Use the canonical PascalCase name.`
    );
  }

  if (frontmatter.title?.toLowerCase() === "overview") {
    report(
      "error",
      rel,
      frontmatterLines.title ?? 1,
      "no-overview",
      "no page carries the title `Overview`. Name the page after its subject."
    );
  }
};

// --- code fences and components --------------------------------------------

const checkFences = (page: DocPage) => {
  const isGuide = page.rel.split("/")[1] === "guides";

  for (const fence of page.fences) {
    const line = lineAt(page.raw, fence.index);

    if (fence.language === "") {
      report(
        "error",
        page.rel,
        line,
        "code-fence",
        "the fence names no language. Name a Shiki language on every fence."
      );
      continue;
    }

    if (!ALLOWED_CODE_LANGUAGES[fence.language]) {
      const hint =
        fence.language === "env"
          ? " Write `dotenv` for an environment file."
          : "";
      report(
        "error",
        page.rel,
        line,
        "code-fence",
        `\`${fence.language}\` is not one of the languages this site uses.${hint}`
      );
      continue;
    }

    if (isGuide && SHELL_CODE_LANGUAGES[fence.language]) {
      report(
        "error",
        page.rel,
        line,
        "guides-audience",
        `a \`${fence.language}\` block belongs in self-hosting/ or contributing/. A guide names no command, file or variable.`
      );
    }
  }
};

const checkComponents = (page: DocPage, registered: Record<string, true>) => {
  for (const component of page.components) {
    if (!registered[component.name]) {
      report(
        "error",
        page.rel,
        lineAt(page.raw, component.index),
        "component",
        `\`${component.name}\` is not registered in src/components/mdx.tsx, so it renders nothing.`
      );
    }
  }
};

// --- links -----------------------------------------------------------------

const checkLinks = (page: DocPage, pages: readonly DocPage[]) => {
  const byUrl: Record<string, DocPage> = {};
  for (const candidate of pages) {
    byUrl[candidate.url] = candidate;
  }

  for (const link of page.links) {
    const line = lineAt(page.raw, link.index);
    const { target } = link;

    if (target.endsWith(".mdx") || target.startsWith("../")) {
      report(
        "error",
        page.rel,
        line,
        "link",
        `\`${target}\` is a relative file link. Write the absolute site path, without an extension.`
      );
      continue;
    }

    if (!target.startsWith(BASE_ROUTE)) {
      continue;
    }

    const parts = ANCHOR_LINK.exec(target);
    const written = (parts?.[1] ?? target).replace(/\/$/, "");
    const anchor = parts?.[2];
    const [first] = written.slice(BASE_ROUTE.length + 1).split("/");

    // A link carries no version: it resolves inside the version it is read in,
    // which is what makes a release snapshot a plain copy.
    if (isVersionId(first)) {
      report(
        "error",
        page.rel,
        line,
        "link",
        `\`${target}\` names a version. Write \`${BASE_ROUTE}/${written
          .slice(BASE_ROUTE.length + 1)
          .split("/")
          .slice(1)
          .join("/")}\`, which resolves inside the version the reader is on.`
      );
      continue;
    }

    const path = `${BASE_ROUTE}/${versionOf(page.rel)}${written.slice(
      BASE_ROUTE.length
    )}`;
    const targetPage = byUrl[path];

    if (!targetPage) {
      report(
        "error",
        page.rel,
        line,
        "link",
        `\`${target}\` resolves to no page.`
      );
      continue;
    }

    if (anchor && !targetPage.anchors[anchor]) {
      report(
        "error",
        page.rel,
        line,
        "link",
        `\`${target}\` names no heading on ${targetPage.rel}.`
      );
    }
  }
};

// --- navigation ------------------------------------------------------------

const checkMeta = (meta: MetaFile, pages: readonly DocPage[], root: string) => {
  const rel = relative(root, meta.file);
  const prefix = meta.folder === "" ? "" : `${meta.folder}/`;

  const owned: Record<string, true> = {};
  for (const page of pages) {
    if (!page.rel.startsWith(prefix)) {
      continue;
    }
    const tail = page.rel.slice(prefix.length).replace(/\.mdx$/, "");
    const [head, ...rest] = tail.split("/");
    if (rest.length === 0) {
      owned[head] = true;
    } else if (rest.length === 1 && rest[0] === "index") {
      owned[head] = true;
    }
  }

  const listed: Record<string, true> = {};
  for (const entry of meta.pages) {
    if (META_DIRECTIVE.test(entry)) {
      continue;
    }
    const name = entry.replace(/^\.\//, "");
    if (listed[name]) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` appears twice in \`pages\`.`
      );
    }
    listed[name] = true;
    if (!owned[name]) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` names no page or folder here.`
      );
    }
  }

  for (const name of Object.keys(owned)) {
    if (!listed[name]) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` is missing from \`pages\`, so it lands last and unordered.`
      );
    }
  }
};

// --- prose -----------------------------------------------------------------

const checkPhrases = (page: DocPage) => {
  const { prose, rel } = page;

  const flag = (
    pattern: RegExp,
    rule: string,
    message: (hit: string) => string
  ) => {
    pattern.lastIndex = 0;
    let match = pattern.exec(prose);
    while (match) {
      report("error", rel, lineAt(prose, match.index), rule, message(match[0]));
      match = pattern.exec(prose);
    }
  };

  for (const phrase of ROADMAP_PHRASES) {
    flag(
      phrase,
      "no-roadmap",
      (hit) => `\`${hit}\` is roadmap language. State what the code does now.`
    );
  }

  flag(
    CONTRACTION,
    "ste-contraction",
    (hit) => `\`${hit}\` is a contraction. ASD-STE100 allows none.`
  );

  for (const [pattern, replacement] of WORD_SUBSTITUTIONS) {
    flag(pattern, "ste-word", (hit) => `\`${hit}\` — write "${replacement}".`);
  }

  for (const [pattern, replacement] of BANNED_MODALS) {
    flag(pattern, "ste-modal", (hit) => `\`${hit}\` — write "${replacement}".`);
  }

  if (page.rel.split("/")[1] === "guides") {
    flag(
      SCREAMING_SNAKE,
      "guides-audience",
      (hit) =>
        `\`${hit}\` is an environment variable or an enum value. It belongs in self-hosting/ or contributing/.`
    );
  }
};

const checkHeadings = (page: DocPage) => {
  for (const heading of page.headings) {
    if (heading.text.trim().toLowerCase() === "overview") {
      report(
        "error",
        page.rel,
        lineAt(page.raw, heading.index),
        "no-overview",
        "no heading is called `Overview`. Name it after its subject."
      );
    }
  }
};

const isProse = (block: string): boolean => {
  const trimmed = block.trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return false;
  }
  // A table cell is a fragment, not a sentence.
  return !TABLE_ROW.test(trimmed);
};

/**
 * A list is one paragraph to Markdown and many statements to a reader, so each
 * item is measured on its own.
 */
const proseUnits = (paragraph: string): string[] => {
  const lines = paragraph.split("\n");
  const isList = lines.some((line) => LIST_ITEM.test(line));
  return isList ? lines : [paragraph];
};

const checkSentenceLength = (page: DocPage, unit: string, start: number) => {
  const sentences = unit
    .trim()
    .split(SENTENCE_SPLIT)
    .filter((sentence) => sentence.trim() !== "");

  for (const sentence of sentences) {
    const words = sentence.match(WORD)?.length ?? 0;
    if (words <= WARN_SENTENCE_WORDS) {
      continue;
    }
    report(
      words > MAX_SENTENCE_WORDS ? "error" : "warning",
      page.rel,
      lineAt(page.prose, page.prose.indexOf(sentence, start)),
      "ste-sentence",
      `${words} words in one sentence. The limit is ${WARN_SENTENCE_WORDS} for an instruction and ${MAX_SENTENCE_WORDS} for a description.`
    );
  }
  return sentences.length;
};

const checkSentences = (page: DocPage) => {
  let cursor = 0;
  for (const paragraph of page.prose.split(PARAGRAPH_SPLIT)) {
    const paragraphStart = page.prose.indexOf(paragraph, cursor);
    cursor = paragraphStart + paragraph.length;
    const units = proseUnits(paragraph);
    let sentenceCount = 0;

    for (const unit of units) {
      if (!isProse(unit)) {
        continue;
      }
      const start = page.prose.indexOf(unit, paragraphStart);
      sentenceCount += checkSentenceLength(page, unit, start);
    }

    if (units.length === 1 && sentenceCount > MAX_PARAGRAPH_SENTENCES) {
      report(
        "warning",
        page.rel,
        lineAt(page.prose, paragraphStart),
        "ste-paragraph",
        `${sentenceCount} sentences in one paragraph. ASD-STE100 allows ${MAX_PARAGRAPH_SENTENCES}.`
      );
    }
  }
};

// --- versions --------------------------------------------------------------

/**
 * `content/docs` holds one folder per version. A release snapshot that keeps
 * `next` in its `meta.json` would drop out of the version dropdown, and the
 * build would stay green.
 */
const checkVersions = async (
  pages: readonly DocPage[],
  metas: readonly MetaFile[]
) => {
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const metaByFolder: Record<string, MetaFile> = {};
  for (const meta of metas) {
    metaByFolder[meta.folder] = meta;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      // The version list is the one file that belongs beside the version
      // folders. A page or a nav file here belongs to no version, so no URL
      // reaches it. Anything else — an editor or OS artifact — is not ours.
      if (CONTENT_FILE.test(entry.name) && entry.name !== "meta.json") {
        report(
          "error",
          entry.name,
          1,
          "version",
          `\`${entry.name}\` sits outside every version. Move it into \`${NEXT_VERSION}/\`.`
        );
      }
      continue;
    }
    const file = join(CONTENT_DIR, entry.name, "meta.json");

    if (!isVersionId(entry.name)) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` is not a version. A folder under content/docs is \`${NEXT_VERSION}\` or \`X.Y\`.`
      );
      continue;
    }

    if (!pages.some((page) => page.rel === `${entry.name}/index.mdx`)) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` has no index.mdx, so the version dropdown has nowhere to land.`
      );
    }

    const meta = metaByFolder[entry.name];
    if (!meta) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` has no meta.json.`
      );
      continue;
    }

    const parsed = JSON.parse(meta.raw) as {
      root?: unknown;
      title?: unknown;
    };

    if (parsed.root !== true) {
      report(
        "error",
        relative(CONTENT_DIR, meta.file),
        1,
        "version",
        'no `"root": true`, so the sidebar mixes every version and no dropdown appears.'
      );
    }

    if (parsed.title !== entry.name) {
      report(
        "error",
        relative(CONTENT_DIR, meta.file),
        1,
        "version",
        `the title is \`${String(parsed.title)}\`; the dropdown labels this version \`${entry.name}\`.`
      );
    }
  }
};

// --- run -------------------------------------------------------------------

const strict = process.argv.includes("--strict");
const pages = await readPages(CONTENT_DIR, BASE_ROUTE);
const metas = await readMetaFiles(CONTENT_DIR);
const registered: Record<string, true> = {};
for (const name of Object.keys(getMDXComponents())) {
  registered[name] = true;
}

if (pages.length === 0) {
  console.error(
    `No .mdx pages under ${CONTENT_DIR}. Run this from apps/fumadocs.`
  );
  process.exit(1);
}

for (const page of pages) {
  ignoredRules = {};
  IGNORE_DIRECTIVE.lastIndex = 0;
  let directive = IGNORE_DIRECTIVE.exec(page.raw);
  while (directive) {
    for (const rule of directive[1].split(",")) {
      ignoredRules[rule.trim()] = true;
    }
    directive = IGNORE_DIRECTIVE.exec(page.raw);
  }

  checkFrontmatter(page);
  checkFences(page);
  checkComponents(page, registered);
  checkLinks(page, pages);

  // A frozen version passed the language rules when it was written, and the
  // word lists keep moving. Its structure still has to hold up.
  if (versionOf(page.rel) === NEXT_VERSION) {
    checkHeadings(page);
    checkPhrases(page);
    checkSentences(page);
  }
}

ignoredRules = {};
for (const meta of metas) {
  checkMeta(meta, pages, CONTENT_DIR);
}

await checkVersions(pages, metas);

// A duplicate anchor on one page breaks a link that names it.
for (const page of pages) {
  const seen: Record<string, true> = {};
  for (const heading of page.headings) {
    const slug = slugify(heading.text);
    if (seen[slug]) {
      report(
        "warning",
        page.rel,
        lineAt(page.raw, heading.index),
        "anchor",
        `\`${slug}\` is the anchor of two headings, so a link to it is ambiguous.`
      );
    }
    seen[slug] = true;
  }
}

findings.sort(
  (left, right) => left.file.localeCompare(right.file) || left.line - right.line
);

let currentFile = "";
for (const finding of findings) {
  if (finding.file !== currentFile) {
    currentFile = finding.file;
    console.log(`\n${CONTENT_DIR}/${currentFile}`);
  }
  const mark = finding.severity === "error" ? "error" : " warn";
  console.log(
    `  ${mark}  ${finding.line}:  ${finding.rule}  ${finding.message}`
  );
}

const errors = findings.filter(
  (finding) => finding.severity === "error"
).length;
const warnings = findings.length - errors;

console.log(
  `\n${pages.length} pages, ${metas.length} meta files: ${errors} errors, ${warnings} warnings.`
);

if (errors > 0 || (strict && warnings > 0)) {
  process.exit(1);
}
